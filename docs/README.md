# Documentación de CNV Learning

**Última actualización:** 12 de mayo de 2026

## Cómo usar esta carpeta

Estos documentos son la fuente de verdad arquitectónica y operativa del proyecto. Cada uno tiene un propósito:

| Documento | Para qué sirve | Cuándo se consulta |
|---|---|---|
| `MVP.md` | Alcance funcional del MVP, criterios de aceptación, fuera de alcance, roadmap | Al iniciar cada bloque de trabajo, al evaluar si una feature entra o no |
| `ARCHITECTURE.md` | 10 reglas duras, estructura de carpetas, patrones por capa, eventos, cache, errores | **Antes de escribir cualquier código**. Es lectura obligatoria del prompt inicial de Claude Code |
| `DATABASE.md` | Modelo de tablas, RLS policies, triggers, seed, migraciones | Al diseñar una feature que toca BD, al revisar PRs con cambios de schema |
| `SECURITY.md` | Modelo de autorización, manejo de secrets, audit, privacidad, compliance | Al diseñar policies, al rotar secrets, ante incidente |
| `BOUNDARIES.md` | Separación entre CNV Learning, ATLAS, CNV Core, Research | Antes de integrar con otro producto, ante tentación de import cruzado |
| `BRAND.md` | Paleta, tipografía, sistema de radios, tono, copy guidelines | Al construir UI, al revisar copy |
| `DEPLOY.md` | Setup, variables, DNS, deploy, backups, runbooks | Al hacer setup inicial, ante incidente, al pasar a producción |

## Orden de lectura inicial

Si entras al proyecto por primera vez, este es el orden recomendado:

1. **`MVP.md`** para entender qué vamos a construir y qué no.
2. **`ARCHITECTURE.md`** para entender cómo se construye (las 10 reglas duras son no negociables).
3. **`BOUNDARIES.md`** para entender el contexto más amplio (CNV no es solo el LMS).
4. **`DATABASE.md`** para entender el modelo de datos.
5. **`SECURITY.md`** para entender autorización y compliance.
6. **`BRAND.md`** cuando vayas a construir UI.
7. **`DEPLOY.md`** cuando vayas a operar (setup, deploy, incidente).

## Para Claude Code

Cuando inicies una sesión de Claude Code para trabajar en este proyecto, **el primer prompt debe incluir el contenido completo de `ARCHITECTURE.md`** como contexto. Esto asegura que Claude conoce:

- Las 10 reglas duras.
- La estructura de carpetas correcta.
- Los patrones por capa (server actions thin, services thick, repositories, policies, events).
- La convención de errores.
- Qué va en server actions y qué en route handlers.

Pegar el documento entero al inicio de la sesión, o si tu cliente lo soporta, mantenerlo como archivo abierto.

Cuando inicies un bloque específico (por ejemplo el Bloque 6 de assignments), pega también:

- El bloque relevante de `MVP.md`.
- Las tablas relevantes de `DATABASE.md`.
- Las policies relevantes de `SECURITY.md`.

## Cómo actualizar estos documentos

**Regla:** si una decisión arquitectónica nueva contradice estos documentos, **el documento se actualiza primero**, y luego el código. No al revés.

El proceso:

1. Crear un PR que modifica el documento relevante.
2. Self-review del cambio: ¿es consistente con el resto?
3. Commit con mensaje explicativo del "por qué".
4. Solo después, implementar el cambio en código en un PR separado.

Esto evita que el código se desvíe silenciosamente de la documentación.

## Convenciones del proyecto

### Sin em dashes

En todo texto del proyecto (docs, código, copy, comentarios) NO se usa em dash (—). Se reemplaza por coma, punto, punto y coma, o paréntesis según corresponda.

### Tono en español

- Tuteo en interfaz, "usted" en documentación legal.
- Sin emojis en UI.
- Sin signos de exclamación múltiples.
- Verbos en presente, frases concisas.

### Comentarios en commits

Cada commit explica el "por qué" no solo el "qué". Migraciones SQL, policies, eventos y prompts requieren comentario en el commit referenciando el doc relevante.

## Contacto

Responsable técnico: Santiago Uribe.
Responsable académico: Director Científico de CNV.

Para incidentes: revisar `SECURITY.md` sección "Incident response".
