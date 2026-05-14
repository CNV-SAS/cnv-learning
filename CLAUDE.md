# CLAUDE.md

**Instrucciones operativas para Claude Code en el proyecto CNV Learning.**

Este archivo se carga automáticamente al iniciar cada sesión. Léelo completo. Su propósito NO es describir el proyecto (eso está en `docs/`), sino establecer cómo debes comportarte mientras trabajas aquí.

---

## Sobre el proyecto en 3 líneas

CNV Learning es la plataforma de aprendizaje propia de Connected Nutrition Ventures SAS. El stack es Next.js 15 + Supabase + Vercel. El MVP es para 10 alumnos del primer cohorte del Diplomado en Medicina Bioeléctrica. El proyecto está **completamente planeado** en `docs/`. Tu trabajo es ejecutar disciplinadamente, no rediseñar.

---

## Orden de lectura

Al inicio de cada sesión, lee EN ESTE ORDEN antes de tocar nada:

1. `docs/README.md` (índice, contexto general)
2. `docs/ARCHITECTURE.md` (10 reglas duras + estructura, IMPRESCINDIBLE)

Al iniciar un bloque específico, lee adicionalmente:

3. La sección correspondiente de `docs/MVP.md`
4. Las tablas relevantes de `docs/DATABASE.md` si el bloque toca BD
5. Las policies relevantes de `docs/SECURITY.md` si el bloque toca auth o datos
6. `docs/BRAND.md` si el bloque toca UI
7. `docs/BOUNDARIES.md` si el bloque potencialmente toca otro dominio CNV
8. `docs/DEPLOY.md` para setup, comandos, runbooks operativos

---

## Las 10 reglas duras (síntesis)

Estas viven en `ARCHITECTURE.md`. No se rompen sin actualizar el doc primero.

1. Ningún acceso directo a Supabase fuera de `data/` (repositorios).
2. Ninguna lógica de negocio en pages, server actions ni route handlers.
3. Ningún `user.role === ...` fuera de policies.
4. Ningún `"use client"` innecesario. Server Components por defecto.
5. Ningún import cruzado entre dominios CNV (Learning, ATLAS, Core, Research).
6. Ningún side effect grande inline en server actions.
7. Ningún tipo global monstruoso. Tipos viven en su módulo.
8. Ningún evento de negocio crítico sin audit trail.
9. Ningún prompt IA inline. Versionado en `modules/*/ai/prompts/`.
10. Ninguna llamada externa sin timeout explícito. Todo pasa por `core/http/`.

---

## Flujo de trabajo

### Bloques 0 a 2 (Setup, Auth, Layout): planning-first OBLIGATORIO

Al recibir el prompt del bloque:

1. Lee los docs relevantes.
2. **NO ejecutes nada todavía.**
3. Devuelve en plain text:
   - Resumen del alcance del bloque (2-3 líneas).
   - Lista de archivos a crear o modificar.
   - Plan de comandos en orden.
   - Decisiones que tomas tú y por qué.
4. Espera aprobación explícita ("adelante", "ejecuta", "OK").
5. Solo entonces ejecuta.

### Bloques 3 en adelante: execution-with-checkpoints

Aprobado el plan general del bloque:

1. Ejecuta sub-tarea 1.
2. Muestra `git diff` resumido.
3. Propón commit message y espera "OK" para comitar.
4. Pasa a sub-tarea 2.
5. Repetir hasta terminar el bloque.
6. Al final, corre el criterio de aceptación y confirma que pasa.

---

## Commits

### Reglas

- **Un commit por sub-tarea completada.** No por bloque entero, no por cada archivo.
- **Formato del mensaje:**
  ```
  <tipo>: <descripción corta en inglés, modo imperativo>
  
  Párrafo en español explicando el "por qué", no solo el "qué".
  Referencia el doc si aplica: "ARCHITECTURE.md regla 9", "DATABASE.md".
  ```
- **Tipos válidos:** `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`.
- **NUNCA hagas `git push`.** El push lo hace Santiago al final del bloque manualmente.
- **NUNCA hagas commits sin mostrar antes el `git diff`** resumido y el mensaje propuesto.

### Ejemplo de buen commit

```
feat: add ai_grading_suggestions table with provider tracking

Persistimos sugerencias IA con provider, latency_ms y status para
trazabilidad y observabilidad (DATABASE.md). Permite comparar prompts
versionados y diagnosticar timeouts/parse_failed sin perder contexto.
Tabla con FK a submissions, índice por submission_id.
```

### Ejemplo de mal commit (NO hacer)

```
update db
```

---

## Manejo de errores

### Al ejecutar un comando que falla

1. **NO reintentes el mismo comando 3 veces.** Eso es ruido.
2. Lee el mensaje de error completo.
3. Diagnostica: ¿es un problema de versión, permisos, configuración, código?
4. Propón solución en texto.
5. Espera aprobación antes de aplicar.

### Al encontrar un conflicto entre código y documentación

1. **El documento gana.** El código está mal.
2. Reporta el conflicto a Santiago.
3. No "ajustes el código para que coincida": pregunta primero, por si el doc es el que necesita actualizarse.

### Al recibir un error que no entiendes después de 2 intentos

Para. No "explores" instalando paquetes random. Pide ayuda con contexto claro:

- Comando ejecutado.
- Error completo.
- Lo que ya intentaste.
- Hipótesis tuya.

---

## Restricciones de estilo (no negociables)

### Idioma y tono

- **Español neutro** en código (variables, funciones, copy de UI), commits y comentarios.
- **Excepción:** los nombres técnicos estándar van en inglés (`userId`, `createdAt`, `submitAssignment`).
- **Tuteo** en interfaz de usuario. "Has completado", "Continúa donde dejaste".
- **Sin emojis en UI.** Sin signos de exclamación múltiples.

### Em-dash

**NUNCA uses em-dash (—) en ningún lugar:** ni en código, ni en copy, ni en docs, ni en commits, ni en comentarios. Reemplaza por:

- Coma cuando es pausa breve.
- Punto cuando separa ideas.
- Punto y coma cuando enumera complejo.
- Paréntesis cuando aclara.

### Comentarios en código

- Comentarios breves, en español, explicando el "por qué", no el "qué".
- **Excepción:** comentarios en SQL pueden ir en inglés si son convención estándar.

---

## Restricciones técnicas críticas

### Next.js

- App Router, no Pages Router.
- **Server Components por defecto.** `"use client"` solo cuando el componente necesita estado, efectos, event handlers de UI, o APIs del navegador.
- Node.js runtime, NO Edge runtime en MVP.
- TypeScript `strict: true` obligatorio.

### Supabase

- Cliente normal (con anon key + RLS) para 99% de los casos.
- Service role (`admin.ts`) SOLO en server actions y route handlers, con comentario justificando por qué se bypassa RLS.
- **Nunca expongas `SUPABASE_SERVICE_ROLE_KEY` al cliente.**

### Validación

- Toda entrada externa pasa por Zod.
- Schemas viven en `modules/<dominio>/validations/`.
- Server actions retornan `Result<T, AppError>`, no hacen throw para errores esperables.

### Dependencias

- **No instales paquetes que no estén en `DEPLOY.md` sin justificación documentada.**
- Si necesitas una nueva dependencia, primero proponla y espera aprobación.
- Verifica que la dependencia no esté abandonada (último commit < 1 año).

---

## Cuándo PARAR y pedir input

- Decisión arquitectónica que no está documentada en `docs/`.
- Tentación de instalar una dependencia no listada.
- Conflicto entre dos documentos.
- Error que no diagnosticas en 2-3 intentos.
- Cualquier cosa que potencialmente cruce dominios CNV (ver `BOUNDARIES.md`).
- Cambio de schema SQL en una tabla ya migrada.
- Cualquier prompt IA nuevo (debe versionarse formalmente).

---

## Lo que NUNCA debes hacer

1. Modificar una migración SQL aplicada. Si necesitas un cambio, crea una nueva migración.
2. Hacer `git push` sin permiso explícito.
3. Importar código entre dominios CNV.
4. Exponer service_role key al cliente.
5. Usar `localStorage` o `sessionStorage` para datos sensibles (sesión, tokens).
6. Asumir que algo es "obvio" sin verificar en `docs/`.
7. Inventar campos de tabla que no estén en `DATABASE.md`.
8. Hacer `fetch()` sin timeout explícito.
9. Usar `dangerouslySetInnerHTML` con input de usuario.
10. Saltarte el planning en bloques 0-2.

---

## Variables de entorno disponibles

Documentadas en `DEPLOY.md`. Las usas con:

- `process.env.SUPABASE_SERVICE_ROLE_KEY` (solo server)
- `process.env.NEXT_PUBLIC_SUPABASE_URL` (cliente OK, es público)
- `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` (cliente OK)
- `process.env.GEMINI_API_KEY` (solo server)
- `process.env.RESEND_API_KEY` (solo server)
- `process.env.UPSTASH_REDIS_REST_URL` (solo server)
- `process.env.UPSTASH_REDIS_REST_TOKEN` (solo server)
- `process.env.SENTRY_DSN`
- `process.env.NEXT_PUBLIC_APP_URL`

**Regla:** todo lo que sea sensitive NUNCA tiene prefijo `NEXT_PUBLIC_`. Si necesitas exponer algo al cliente, primero verifica que no sea sensitive.

---

## Sobre las preguntas del usuario

Santiago (el responsable técnico) NO es desarrollador profesional. Es competente, pero:

- Cuando explique conceptos técnicos, explícalos sin asumir contexto avanzado.
- Si vas a usar terminología nueva, dale 1 línea de contexto.
- No le devuelvas paredes de código sin explicación.
- Si una decisión tiene trade-offs, explícalos brevemente.

---

## Verificación al final de cada bloque

Antes de declarar un bloque terminado:

1. **Ejecuta el criterio de aceptación** documentado en `MVP.md`.
2. **Corre `tsc --noEmit`** (verificación de tipos).
3. **Corre `npm run lint`** si está configurado.
4. **Corre los tests** relevantes (`vitest run`).
5. **Confirma que el deploy local funciona** (`npm run dev`).
6. Reporta a Santiago: "Bloque N completo. Criterios de aceptación: [✓ A, ✓ B, ✓ C]. Listo para push."

---

## Recordatorio final

Este proyecto se construye **una sola vez bien hecho.** No es un prototipo desechable. Es la fundación de una Learning Core Platform que crecerá en los próximos años. Cada decisión que tomes hoy se hereda.

Cuando dudes entre velocidad y calidad arquitectónica, elige calidad. Cuando dudes entre patrón documentado y patrón "más simple", elige el documentado. Cuando dudes entre actuar e inventar, pregunta.

La disciplina arquitectónica es barata hoy y carísima dentro de 6 meses si no se cuidó.
