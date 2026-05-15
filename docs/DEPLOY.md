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

**Antes de instalar cualquier dependencia**, crea DOS archivos en la raíz del proyecto. Esta separación es necesaria porque pnpm 11 ya NO lee settings non-auth desde `.npmrc`: las settings específicas de pnpm viven en `pnpm-workspace.yaml`.

**Archivo 1: `.npmrc`** (settings que ambos npm y pnpm entienden):

```
ignore-scripts=true
save-exact=true
audit-level=moderate
```

**Archivo 2: `pnpm-workspace.yaml`** (settings específicas de pnpm 11+):

```yaml
# Esperar 7 días (10080 minutos) antes de instalar una versión recién publicada.
# Defensa principal contra ataques tipo Mini Shai-Hulud donde packages
# comprometidos son detectados y removidos del registro dentro de horas/días.
minimumReleaseAge: 10080

# Bloquea subdependencias que vengan de fuentes no estándar (git, tarballs URL).
blockExoticSubdeps: true
```

**Por qué cada setting:**

- `ignore-scripts=true` (.npmrc): bloquea ejecución de scripts post-install. Mitigación principal contra malware tipo Mini Shai-Hulud. Recomendado por CISA. Aplica a ambos npm y pnpm.
- `save-exact=true` (.npmrc): pinea versiones exactas. Evita que `^1.2.3` permita upgrade silencioso a `1.2.4` comprometido.
- `audit-level=moderate` (.npmrc): alerta en vulnerabilidades moderadas hacia arriba.
- `minimumReleaseAge: 10080` (pnpm-workspace.yaml): solo packages publicados hace al menos 7 días (10080 minutos). En pnpm 11+ esto es un setting específico de pnpm y se configura en YAML, NO en `.npmrc`. Si lo pones en `.npmrc` con valor numérico, npm intenta leerlo y rompe todas las instalaciones (es un setting introducido por pnpm que npm interpreta como días desnudos).
- `blockExoticSubdeps: true` (pnpm-workspace.yaml): activado por defecto en pnpm 11, lo dejamos explícito para que sobreviva si en algún momento cambia el default.

**Tradeoff conocido de `ignore-scripts=true`:** algunos packages legítimos necesitan scripts post-install (compilar binarios). Si la instalación de uno falla, NO desactives la protección globalmente. Habilita el script puntualmente con `pnpm rebuild <package>` tras verificación manual del package, o agrega el paquete a `onlyBuiltDependencies` en `package.json` para permitir su build específico.

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
  prettier-plugin-tailwindcss \
  supabase
```

**Verificación post-install:**

Después de cada `pnpm add` masivo, verifica que no haya alertas de seguridad:

```bash
pnpm audit
```

Si aparece alguna vulnerabilidad de severidad `high` o `critical`, no avances al siguiente paso. Reporta y decide.

### 4. Configurar shadcn/ui

```bash
pnpm dlx shadcn@latest init
```

Configuración recomendada:
- Style: New York
- Base color: Slate
- CSS variables: Yes
- Use pnpm: Yes (debería detectarlo automáticamente)

Luego, instalar componentes base:

```bash
pnpm dlx shadcn@latest add button input label textarea card dialog sheet dropdown-menu avatar badge alert progress tabs select form skeleton
```

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

El Supabase CLI ya fue agregado como devDependency en el paso 3 (`pnpm add -D supabase`).

Inicializar y vincular:

```bash
pnpm dlx supabase init
pnpm dlx supabase link --project-ref YOUR_PROJECT_REF
```

Esto crea `supabase/` en el repo y vincula con el proyecto remoto.

### 8. Conectar Vercel

Vercel CLI se instala globalmente (excepción justificada porque es CLI de uso recurrente y NO entra al `package.json` del proyecto):

```bash
pnpm add -g vercel
vercel link
vercel env pull
```

Esto vincula el repo local con un proyecto Vercel y descarga variables de entorno.

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
