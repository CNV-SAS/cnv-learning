# Operación y despliegue de CNV Learning

**Última actualización:** 12 de mayo de 2026
**Dominio de producción:** `https://lms.cnvsystem.com`

## Cuentas y servicios necesarios

| Servicio | Plan | Uso |
|---|---|---|
| GitHub | Free | Repositorio del código |
| Vercel | Hobby (gratis) inicial, evaluar Pro en v1.1 | Hosting, deploys, preview branches |
| Supabase | Free inicial (500 MB DB) | Base de datos, Auth, Storage |
| Cloudflare | Free | DNS del dominio `cnvsystem.com` |
| Resend | Free (3.000 emails/mes) | Emails transaccionales |
| Google AI Studio | Free tier | API Gemini Flash para SpeedGrader |
| Sentry | Developer free | Reporte de errores |
| Anthropic API (opcional) | Pay-as-you-go | Alternativa a Gemini si migran a Claude |

## Variables de entorno

`.env.local.example` que va al repo (sin valores reales):

```bash
# ===== Supabase =====
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...

# ===== IA =====
GEMINI_API_KEY=...
# Anthropic, opcional para migración futura
ANTHROPIC_API_KEY=

# ===== Email =====
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@lms.cnvsystem.com
EMAIL_REPLY_TO=soporte@cnvsystem.com

# ===== Observabilidad =====
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=

# ===== App =====
NEXT_PUBLIC_APP_URL=https://lms.cnvsystem.com
NEXT_PUBLIC_APP_NAME=CNV Learning

# ===== Modo =====
NODE_ENV=development
```

En Vercel, las mismas variables se cargan en el panel:

- **Production**: valores reales.
- **Preview**: valores reales (mismas APIs, no hay staging separado en MVP).
- **Development**: para pulls locales con `vercel env pull`.

**Regla crítica:** los secrets sensibles (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `SENTRY_AUTH_TOKEN`) NUNCA se exponen al cliente. Sin prefijo `NEXT_PUBLIC_`.

## Setup inicial del proyecto

Pasos en orden:

### 1. Crear repositorio en GitHub

- Nombre: `cnv-learning`.
- Privado.
- README mínimo, `.gitignore` para Node.

### 2. Bootstrap Next.js (con pnpm)

**Antes de cualquier comando:** verifica que tienes pnpm activo:

```bash
pnpm --version
```

Si no, activarlo con corepack (viene incluido con Node.js):

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

Bootstrap del proyecto:

```bash
pnpm create next-app@latest cnv-learning \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --eslint \
  --no-import-alias \
  --use-pnpm

cd cnv-learning
git init
git remote add origin https://github.com/CNV/cnv-learning.git
```

Configurar `tsconfig.json` con `"strict": true` (debería venir así por defecto, verificar).

### 2bis. Crear archivos de configuración de supply chain (CRÍTICO)

**Antes de instalar cualquier dependencia**, crea DOS archivos en la raíz del proyecto. Esta separación es necesaria porque pnpm 11 **ya NO lee ninguna setting non-auth desde `.npmrc`**: todas las settings específicas de pnpm viven en `pnpm-workspace.yaml` con sintaxis camelCase.

**Archivo 1: `.npmrc`** (queda como placeholder; solo se usa para registry/auth si se necesita en el futuro):

```
# pnpm 11 separa config en dos archivos: .npmrc para auth/registry,
# pnpm-workspace.yaml para todo lo demás. Las settings de supply
# chain (ignoreScripts, saveExact, minimumReleaseAge, allowBuilds,
# overrides, etc.) viven en pnpm-workspace.yaml. Este archivo queda
# solo como placeholder.
```

**Archivo 2: `pnpm-workspace.yaml`** (toda la config de pnpm 11):

```yaml
# Ventana de cuarentena antes de instalar versión recién publicada.
# 1440 min (24h) combinado con ignoreScripts + allowBuilds explícito da
# defensa razonable contra Mini Shai-Hulud sin la fricción de un threshold
# de 7 días que bloquea deps transitivas oficiales legítimas.
minimumReleaseAge: 1440

# Bloquear deps transitivas de fuentes exóticas (git, tarballs URL).
blockExoticSubdeps: true

# Bloquear scripts post-install de TODOS los packages excepto los
# explícitamente whitelisted abajo. Vector principal de Mini Shai-Hulud.
ignoreScripts: true

# Pinear versiones exactas (sin ^ ni ~) cuando se agrega un package.
saveExact: true

# Whitelist de packages cuyos install scripts SÍ pueden correr.
# Solo paquetes verificados que necesitan compilar/descargar binarios.
# pnpm 11 usa allowBuilds (object con booleans), no onlyBuiltDependencies
# (array, deprecated).
allowBuilds:
  sharp: true
  unrs-resolver: true
  "@sentry/cli": true
  supabase: true
  esbuild: true

# Overrides de versiones para parchar vulnerabilidades antes de que las
# deps padre suban sus pins.
overrides:
  postcss: "8.5.10"   # GHSA-qx2v-qp2m-jg93 (XSS via </style> en stringify)
```

**Por qué cada setting:**

- `minimumReleaseAge: 1440` (24h): solo packages publicados hace al menos 1 día. Defensa primaria contra Mini Shai-Hulud donde packages comprometidos son detectados y removidos del registro dentro de horas. Valor 10080 (7 días) probado y descartado: bloquea deps transitivas legítimas que se publican rápido (ej. `baseline-browser-mapping` de web-platform-dx/W3C). 1440 da un balance pragmático.
- `blockExoticSubdeps: true`: rechaza dependencias indirectas que vengan de git URLs, tarballs sueltos, etc. Activado por default en pnpm 11; explícito para que sobreviva cambios de default.
- `ignoreScripts: true`: bloquea ejecución de scripts post-install. Mitigación principal contra malware tipo Mini Shai-Hulud. Recomendado por CISA.
- `saveExact: true`: pinea versiones exactas. Evita que `^1.2.3` permita upgrade silencioso a `1.2.4` comprometido.
- `allowBuilds`: object con booleanos (NO el deprecated `onlyBuiltDependencies` array de pnpm 10 y anteriores). Lista de packages cuyo postinstall puede correr. Cada entrada requiere verificación previa del package y justificación inline.
- `overrides`: fuerza una versión específica de un transitive dep ignorando las ranges declaradas por los padres. Usar solo para parchar vulnerabilidades con CVE conocido.

**Tradeoff conocido de `ignoreScripts: true`:** algunos packages legítimos necesitan postinstall scripts (compilar binarios nativos, descargar binarios externos). Si la instalación de uno falla pidiendo aprobación, NO desactives la protección globalmente. Verifica el package (oficial, mantenedor confiable, sin historial de compromisos) y si pasa, agrégalo a `allowBuilds`. Si es un package transitorio que se usa solo via `pnpm dlx`, igual hay que whitelistearlo porque pnpm dlx aplica las mismas reglas.

**Caso conocido del proyecto:** `supabase` (CLI) se invoca via `pnpm dlx supabase ...` y NO está en devDependencies (su tarball NPM no incluye el binario; el postinstall lo descarga, lo cual generaba warnings ENOENT en CI cuando estaba en devDeps). Ver sección 7 para detalle.

### 3. Instalar dependencias clave

```bash
pnpm add \
  @supabase/supabase-js \
  @supabase/ssr \
  @upstash/ratelimit \
  @upstash/redis \
  zod \
  react-hook-form \
  @hookform/resolvers \
  date-fns \
  lucide-react \
  sonner \
  clsx \
  tailwind-merge \
  @sentry/nextjs \
  resend \
  @react-pdf/renderer \
  @google/generative-ai \
  react-markdown \
  remark-gfm \
  isomorphic-dompurify

pnpm add -D \
  vitest \
  @types/node \
  prettier \
  prettier-plugin-tailwindcss
```

`supabase` (CLI) NO se instala como devDep. Ver sección 7 para el detalle.

**Verificación post-install:**

Después de cada `pnpm add` masivo, verifica que no haya alertas de seguridad:

```bash
pnpm audit
```

Si aparece alguna vulnerabilidad de severidad `high` o `critical`, no avances al siguiente paso. Reporta y decide.

### 4. Configurar shadcn/ui v4

shadcn v4 abandonó la matriz "Style × BaseColor" (New York/Default × Slate/Gray/Stone/Zinc/Neutral) y la reemplazó por presets monolíticos (Nova, Vega, Maia, Lyra, Mira, Luma, Sera). CNV Learning usa **Radix library + Vega preset** (clásico shadcn/ui, encaja con el tono visual "profesional, calmado" del producto). Ver `docs/BRAND.md` sección "Implementación técnica" para el detalle de la elección.

Comando recomendado (no-interactivo):

```bash
pnpm dlx shadcn@latest init -t next -b radix -p vega --css-variables --yes
```

Esto genera `components.json` con `"style": "radix-vega"`, `"baseColor": "neutral"` (campo legacy sin efecto en regeneración), `"cssVariables": true`, e `"iconLibrary": "lucide"`. También crea `src/lib/utils.ts` con el helper `cn()`.

Luego, instalar las primitivas base:

```bash
pnpm dlx shadcn@latest add button input label textarea card dialog sheet dropdown-menu avatar badge alert progress tabs select skeleton
```

**Gap conocido del registry Vega:** el componente `form` no se sirve correctamente desde el registry Vega en el momento de instalación (Vega es un preset nuevo y algunos primitivos legacy aún viven en el registry "new-york"). Workaround documentado y probado:

```bash
pnpm dlx shadcn@latest add https://ui.shadcn.com/r/styles/new-york/form.json
```

Esto descarga el primitivo `form` desde el registry legacy y lo emplaza correctamente en `src/components/ui/form.tsx`. El comportamiento es idéntico al esperado.

**No mezclar otros preset components.** Si surgen más gaps similares, primero verificar que el componente no exista en `pnpm dlx shadcn@latest registry list` antes de caer al workaround legacy.

### 5. Configurar Sentry

```bash
pnpm dlx @sentry/wizard@latest -i nextjs
```

El wizard pide el DSN, lo pegas, crea `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, e instrumenta el proyecto.

**Nota sobre SENTRY_AUTH_TOKEN:** es opcional para el MVP. Sirve para subir source maps durante el build, lo cual da stack traces legibles en producción. Si lo dejas vacío, el wizard configurará Sentry sin source maps (suficiente para el MVP). Se puede agregar después en el Bloque 18 sin romper nada.

### 6. Crear proyecto Supabase

- Crear proyecto en `https://supabase.com/dashboard`.
- Nombre: `cnv-learning`.
- Región: `us-east-1` (o `sa-east-1` si está disponible para menor latencia desde Colombia).
- Plan: Free para MVP.

Anotar:
- Project URL
- Anon (publishable) key
- Service role key

Cargar al `.env.local` y a Vercel.

### 7. Configurar Supabase CLI local

**El Supabase CLI NO se instala como devDependency.** Siempre se invoca vía `pnpm dlx supabase ...` (init, link, db push, gen types, etc.).

Inicializar y vincular:

```bash
pnpm dlx supabase init
pnpm dlx supabase link --project-ref YOUR_PROJECT_REF
```

Esto crea `supabase/` en el repo y vincula con el proyecto remoto.

**Por qué no como devDep:** el package `supabase` publica un tarball NPM **sin** el binario nativo; el binario se descarga del repositorio en GitHub durante el `postinstall` del package. pnpm crea los symlinks de `node_modules/.bin/` **antes** de que corra el postinstall, lo que generaba un warning ENOENT en builds de CI (Vercel) cosmético pero recurrente. Como el CLI nunca se invocaba directamente (solo vía `pnpm dlx`), tenerlo en devDependencies era dead weight con ruido. Se eliminó del `package.json`.

**Lo que SÍ se mantiene:** `allowBuilds.supabase: true` en `pnpm-workspace.yaml`. Esa línea es necesaria para que el postinstall corra cuando `pnpm dlx supabase ...` descarga el package temporalmente. Sin ella, el CLI no funcionaría desde dlx (no descargaría el binario).

**Diferencia con `@supabase/supabase-js`:** ese package SÍ está en `dependencies` (no devDeps) porque es el SDK que usa la app productiva. Es independiente del CLI.

### 8. Conectar Vercel

Vercel CLI se instala globalmente (excepción justificada porque es CLI de uso recurrente y NO entra al `package.json` del proyecto):

```bash
pnpm add -g vercel
vercel link
vercel env pull
```

Esto vincula el repo local con un proyecto Vercel y descarga variables de entorno.

#### 8.1. Corepack y packageManager en Vercel

El campo `"packageManager": "pnpm@11.1.2"` del `package.json` es necesario para que Vercel use la misma versión de pnpm que el entorno local. Sin esto, Vercel cae al default histórico (pnpm 10), que no respeta la sintaxis camelCase de `allowBuilds` en `pnpm-workspace.yaml` (ni el resto de settings de pnpm 11: `minimumReleaseAge`, `overrides.postcss`, `blockExoticSubdeps`).

Para que Vercel respete el campo `packageManager`, hay que activar Corepack vía environment variable en el proyecto:

```
ENABLE_EXPERIMENTAL_COREPACK=1
```

Configurar en Vercel Dashboard → Project Settings → Environment Variables, marcando los 3 scopes (Production, Preview, Development).

**Síntoma si falta la env var:** Vercel ignora `packageManager`, usa pnpm 10, y los builds reportan warnings como `Failed to create bin at /vercel/path0/node_modules/.bin/supabase` porque `allowBuilds` no se interpreta. La app productiva sigue funcionando (el binario CLI es solo para desarrollo local), pero el warning ensucia los logs.

**Nota técnica:** Corepack es marcado como experimental por Node.js. Vercel lo soporta documentadamente desde 2022 (estable hasta hoy), pero si en el futuro cambia o quita su soporte, habría que migrar a alternativa (instalar pnpm 11 manualmente vía Custom Install Command en Vercel). Riesgo bajo en la práctica.

### 9. Configurar DNS en Cloudflare

En el panel de Cloudflare, en la zona `cnvsystem.com`:

- **Tipo:** CNAME
- **Nombre:** `lms`
- **Target:** `cname.vercel-dns.com`
- **Proxy:** Activado (nube naranja).
- **SSL:** Full (strict).

En Vercel → Project → Domains:

- Agregar `lms.cnvsystem.com`.
- Vercel verifica la propiedad vía DNS.
- Vercel emite certificado SSL automáticamente.

Tiempo de propagación: 1 a 60 minutos.

### 10. Verificación final

- `https://lms.cnvsystem.com` responde con la página inicial de Next.js.
- Sentry recibe un evento de prueba (provocar error a propósito en una ruta).
- Supabase tiene la migración inicial aplicada.
- Vercel hace deploy automático al pushear a `main`.

## Flujo de deploy

### Branches

- `main`: producción, deploys automáticos a `lms.cnvsystem.com`.
- Feature branches: deploys de preview con URL única (ej. `cnv-learning-git-feature-xxx.vercel.app`).

### Pipeline

Cada push a una branch dispara:

1. Build de Next.js en Vercel.
2. Type check con `tsc --noEmit`.
3. Lint con ESLint.
4. Tests con `vitest run`.
5. Deploy automático si build exitoso.

Si cualquier paso falla, Vercel marca el deploy como failed y no se promueve.

### Commits

Convención de commits (sin formalidad de conventional commits, pero con disciplina):

- Cada commit con mensaje explicativo del "por qué", no solo "qué".
- Migraciones SQL con comentario al inicio.
- Cambios de policy o boundary requieren referencia al doc relevante.

Ejemplo malo: `add forum migration`.
Ejemplo bueno: `add forum schema: posts and replies, plain hierarchy (no nested replies in MVP per BOUNDARIES note). RLS allows enrolled users to read, authenticated to post in their courses`.

## Migraciones

### Aplicar migraciones nuevas en local

```bash
pnpm dlx supabase db reset
```

Esto reseta la base local, aplica todas las migraciones de `supabase/migrations/`, y corre el seed.

### Aplicar migraciones a producción

```bash
pnpm dlx supabase db push
```

Esto aplica solo las migraciones nuevas (no aplicadas aún) al proyecto remoto.

**Regla dura:** nunca editar una migración aplicada en producción. Si necesitas un cambio, creas una migración nueva.

### Generar tipos TypeScript

Tras aplicar migraciones:

```bash
pnpm dlx supabase gen types typescript --linked > src/types/database.generated.ts
git add src/types/database.generated.ts
git commit -m "regenerate database types after migration 00XX"
```

## Backups y disaster recovery

### Estado actual (MVP)

- Supabase Free tier hace backup automático diario.
- Retención: 7 días.
- Procedimiento de restauración: vía dashboard de Supabase, "Restore from backup".

### Prueba de restauración

**Regla dura:** un backup no existe hasta que se ha restaurado exitosamente.

Antes del lanzamiento, ejecutar una prueba:

1. Crear un proyecto Supabase secundario llamado `cnv-learning-restore-test`.
2. Restaurar el backup más reciente al proyecto secundario.
3. Verificar que los datos están completos y las RLS policies aplicadas.
4. Documentar el procedimiento en este archivo.
5. Eliminar el proyecto de test.

### Plan v1.1 (cuando suban a Supabase Pro)

- Activar Point-in-Time Recovery (PITR), permite restaurar a cualquier punto de los últimos 7 días con granularidad de segundos.
- Dump semanal automatizado a Backblaze B2 vía GitHub Action (~1 USD/mes).
- Documentar runbook completo de recovery en este archivo.

## Runbook: crear un usuario manualmente

1. Ir a `https://supabase.com/dashboard/project/YOUR_PROJECT/auth/users`.
2. Click "Add user" → "Send invitation".
3. Email del usuario, opcionalmente metadata `{ full_name: "Nombre", role: "student" }`.
4. El usuario recibe email con link de invitación.
5. Al hacer clic, define su contraseña.
6. Verificar en `https://supabase.com/dashboard/project/YOUR_PROJECT/editor/profiles` que el profile se creó automáticamente por trigger.

Alternativa: desde el panel admin del LMS (cuando esté hecho el Bloque 14), Santiago crea el usuario directamente con un formulario que llama service role.

## Runbook: forzar reset de contraseña

1. Si el usuario no responde a "olvidé mi contraseña", Santiago entra al panel admin.
2. En la lista de usuarios, click "Resetear contraseña".
3. El sistema dispara un email vía Supabase Auth con link de reset.
4. El usuario recibe el email y define nueva contraseña.

Audit log generado: `admin.password_reset_forced`.

## Runbook: incidente de Sentry

1. Sentry notifica error nuevo o spike.
2. Verificar severidad: ¿afecta a alumnos? ¿es ruidoso?
3. Si afecta a alumnos: revisar contexto (requestId, userId, stack), reproducir, corregir.
4. Si es ruidoso pero no afecta: agregar al issue tracker para v1.1.
5. Documentar incidentes mayores en `docs/incidents/YYYY-MM-DD-titulo.md`.

## Runbook: revocar un certificado

1. Santiago como admin entra al panel admin → Certificados.
2. Busca el certificado por nombre del alumno o ID.
3. Click "Revocar", ingresa razón.
4. El sistema actualiza `certificates.status = 'revoked'`, `revoked_at = now()`, `revoked_by = admin.id`, `revoked_reason`.
5. La página pública `/verify/<id>` ahora muestra "Revocado: <razón>".
6. Audit log generado: `certificate.revoked`.
7. Email automático al alumno (si está activado).

## Limites del plan Free de Supabase

A monitorear:

- **DB size:** 500 MB. Con 10 alumnos y un curso, no llegamos ni al 1%. Cuando lleguemos a 80%, upgrade a Pro.
- **Bandwidth:** 5 GB/mes. Video se sirve desde YouTube, así que no consumimos casi nada.
- **Storage:** 1 GB. Para PDFs de lecciones y avatares, suficiente para MVP. Cuando lleguemos a 80%, evaluar.
- **Auth users:** sin límite estricto en Free, pero las "MAU" cuentan para facturación si activan extras.
- **Edge functions:** 500K invocations/mes. No usamos en MVP.

## Limites del plan Hobby de Vercel

A monitorear:

- **Bandwidth:** 100 GB/mes. Con un cohorte de 10 personas, sobra mucho.
- **Build minutes:** 6000/mes. Más que suficiente.
- **Serverless function execution:** 100 GB-hours/mes. SpeedGrader IA y certificados son los más pesados, monitorear.
- **Image optimization:** 1000 transformations/mes. Bajo para producción, evaluar v1.1.

Cuando Vercel marque que estamos al 80% de algún límite, evaluar upgrade a Pro (20 USD/mes).

## Smoke test manual antes del lanzamiento

Antes de declarar el MVP terminado, ejecutar este checklist completo. Ver `docs/SMOKE-TEST.md` que se genera al final del Bloque 18 con los 30 puntos detallados. Aquí solo los grupos:

1. **Auth flow:** login, logout, forgot password, reset password.
2. **Estudiante:** entrar a curso, navegar lecciones, marcar completadas, ver progreso, entregar tarea, ver calificación, descargar certificado.
3. **Docente:** ver dashboard, calificar entrega manual, calificar con sugerencia IA, emitir anuncio.
4. **Admin:** crear usuario, cambiar rol, revocar certificado, ver auditoría, emitir anuncio global.
5. **Público:** verify de certificado válido y revocado, páginas legales.
6. **Email:** notificaciones llegan, links funcionan.
7. **Errores:** 404, error boundary, mensajes de validación.
8. **Móvil:** todos los flujos críticos en pantalla de 375px.
9. **Sentry:** errores se reportan.
10. **Performance:** Lighthouse score > 80 en home y dashboard.

## Costos estimados del MVP en operación

| Servicio | Costo mensual |
|---|---|
| GitHub | $0 |
| Vercel Hobby | $0 |
| Supabase Free | $0 |
| Cloudflare DNS | $0 |
| Resend Free | $0 |
| Gemini Flash | ~$0 (free tier suficiente para 10 alumnos) |
| Sentry Developer | $0 |
| Dominio cnvsystem.com | ya está pagado |
| **Total mensual MVP** | **~$0** |

Cuando el primer cohorte termine y proyecten más, los upgrades probables son:

- Supabase Pro: $25/mes (PITR, mejor performance, más storage).
- Vercel Pro: $20/mes (analytics, mejor cache, más recursos).
- Total post-MVP estimado: $45-50/mes.

## Próximos hitos operativos

- **Día 0 al 7:** ejecutar los 18 bloques del MVP.
- **Día 8:** smoke test completo, lanzamiento del primer cohorte.
- **Semana 2 al 4:** observar uso real, recopilar feedback, identificar bugs.
- **Semana 4:** retrospectiva, priorizar features de v1.1.
- **Mes 2 al 4:** v1.1 (editor de docente, foros mejorados, PostHog, tests E2E).
- **Mes 4 al 6:** v2 (pagos, multi-curso, integración ATLAS, 2FA).
