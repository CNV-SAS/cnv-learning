# Seguridad y privacidad de CNV Learning

**Última actualización:** 12 de mayo de 2026

## Filosofía: defensa en profundidad

La seguridad no descansa en una sola capa. Cuatro líneas de defensa actúan en paralelo:

1. **Row Level Security en Supabase.** Línea principal. Aunque alguien tenga la anon key (que es pública por diseño), no puede leer ni modificar datos que no le corresponden.
2. **Policies de autorización en el código.** Funciones explícitas tipo `canGradeAssignment(user, resource)` que las server actions y route handlers consultan ANTES de cualquier mutación.
3. **Validación de entrada con Zod.** Toda entrada externa (formularios, route params, body de API) pasa por un schema antes de tocar lógica de negocio.
4. **Audit trail.** Todo evento crítico queda registrado en `audit_logs` para forense post-incidente.

**El middleware NO es una capa de seguridad.** Solo refresca el token de sesión y redirige al login si no hay sesión. Cualquier decisión de "puede o no puede hacer X" vive en las cuatro capas anteriores.

## Modelo de autorización: RBAC contextual

CNV Learning usa RBAC (Role-Based Access Control) con un matiz importante: las verificaciones se hacen mediante **policies contextuales**, no chequeos directos de `user.role`.

### Roles del MVP

- **`student`**: alumno inscrito en uno o más cursos. Por defecto.
- **`teacher`**: docente asignado a uno o más cursos. Puede ver alumnos, calificar, emitir anuncios al curso.
- **`admin`**: gestiona usuarios, cursos, certificados, ve auditoría completa. Solo Santiago en MVP.

### Policies contextuales (en lugar de role checks regados)

Prohibido en el código:

```typescript
if (user.role === 'teacher') {
  // hacer algo
}
```

Obligatorio:

```typescript
if (canGradeAssignment(user, submission)) {
  // hacer algo
}
```

Las policies viven en `modules/<dominio>/policies/`. Su firma siempre incluye `(user, resource, context?)`. Internamente pueden verificar el rol, pero esa es la implementación. La interfaz pública es contextual.

Ejemplo:

```typescript
// modules/assignments/policies/can-grade.ts
import type { AuthenticatedUser } from '@/modules/auth/types';
import type { Submission } from '@/modules/assignments/types';

export function canGradeAssignment(
  user: AuthenticatedUser,
  submission: Submission,
): boolean {
  if (user.role === 'admin') return true;
  if (user.role !== 'teacher') return false;
  return submission.course.teacherIds.includes(user.id);
}
```

Cuando en v2 lleguen permisos complejos (ABAC), la firma no cambia. Solo se enriquece la implementación interna. Los call sites siguen llamando `canGradeAssignment(user, submission)` sin modificación.

### Convención de nombres de policies

- `canViewX(user, resource)` para lecturas.
- `canCreateX(user, context)` para creaciones.
- `canEditX(user, resource)` para actualizaciones.
- `canDeleteX(user, resource)` para eliminaciones.
- `canManageX(user, context)` para CRUD completo.

### Catálogo de policies del MVP

- `auth/policies/can-access-admin.ts`
- `auth/policies/can-access-teacher-panel.ts`
- `courses/policies/can-view-course.ts`
- `courses/policies/can-edit-course.ts`
- `enrollments/policies/can-enroll-user.ts`
- `progress/policies/can-mark-lesson-complete.ts`
- `assignments/policies/can-submit-assignment.ts`
- `assignments/policies/can-grade-assignment.ts`
- `assignments/policies/can-view-submission.ts`
- `forum/policies/can-post-in-forum.ts`
- `certificates/policies/can-issue-certificate.ts`
- `certificates/policies/can-revoke-certificate.ts`
- `admin/policies/can-manage-users.ts`

Cada una con su test en `tests/policies.test.ts`.

## Service role key: regla crítica

La `SUPABASE_SERVICE_ROLE_KEY` bypassa RLS completamente. Es la llave maestra.

**Reglas:**

1. **Nunca se expone al cliente.** Solo se usa en server actions, route handlers, y server components que la requieran explícitamente.
2. **Nunca se importa fuera de `src/lib/supabase/admin.ts`.** Hay un único archivo que la usa. El resto del código importa el cliente normal con RLS.
3. **Su uso se justifica en comentario.** Cada vez que `lib/supabase/admin.ts` se llama, el código tiene un comentario explicando por qué se necesita bypassear RLS.

Casos legítimos para usar service role:

- Trigger automático de creación de profile al crear user.
- Verificación pública de certificado en `/verify/<id>` (la página NO requiere login, así que no hay `auth.uid()` para RLS).
- Audit logging desde rutas que el usuario aún no está autenticado (intento de login fallido).
- Tareas administrativas masivas iniciadas por admin (inscripción de cohorte completo).

Casos NO legítimos (usar cliente normal):

- Leer datos del usuario actual.
- Cualquier operación donde RLS aplica naturalmente.

## Audit trail

`audit_logs` registra eventos críticos. Toda escritura a esta tabla pasa por `core/audit/log.ts`:

```typescript
export async function logAuditEvent(input: {
  actorId: string | null;
  actorEmail: string | null;
  event: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await supabaseAdmin.from('audit_logs').insert(input);
}
```

### Eventos que SIEMPRE generan audit log

Según la regla dura #8 del proyecto:

- `user.created`, `user.role_changed`, `user.deleted`, `user.suspended`
- `enrollment.created`, `enrollment.cancelled`
- `assignment.graded`, `assignment.regraded`
- `certificate.issued`, `certificate.revoked`
- `course.completed`
- `admin.login` (con IP y user agent)
- `admin.password_reset_forced`
- `lesson.updated_by_admin`, `course.updated_by_admin`

### Acceso a audit logs

- Solo `admin` puede leer `audit_logs` (RLS).
- La UI de auditoría tiene paginación obligatoria (no cargar 10.000 rows).
- No se permite editar ni borrar audit logs (sin policies de update/delete).

## Validación de entrada

Toda entrada externa pasa por Zod. No hay excepciones.

```typescript
// modules/forum/validations/create-thread.ts
import { z } from 'zod';

export const createThreadSchema = z.object({
  forumId: z.string().uuid(),
  title: z.string().min(3).max(200),
  body: z.string().min(10).max(10000),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;
```

Las server actions consumen estos schemas:

```typescript
'use server';

import { createThreadSchema } from '@/modules/forum/validations/create-thread';

export async function createThread(input: unknown) {
  const parsed = createThreadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: new ValidationError('VALIDATION_FAILED', parsed.error.message) };
  }
  // ...
}
```

## Manejo de secrets

### En desarrollo local

Todas las variables en `.env.local`. Este archivo está en `.gitignore`. Nunca se commitea.

`.env.local.example` queda en el repo con placeholders:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...
GEMINI_API_KEY=...
RESEND_API_KEY=re_...
SENTRY_DSN=https://...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### En producción

Variables en panel de Vercel → Project → Settings → Environment Variables. Configurar tres entornos:

- **Production**: domain `lms.cnvsystem.com`.
- **Preview**: deploys de PRs.
- **Development**: pulls del CLI de Vercel.

Cada secret rotable se rota cada 90 días por política. Rotación documentada en runbook.

### Reglas de manejo

1. **Jamás pegar secrets en chat (Slack, Telegram, IA, email).** Si necesitas pasarlos a otra persona, vía gestor de secretos compartido (1Password, Vault).
2. **Si un secret se filtra, rotación inmediata** y revisión de logs por uso indebido.
3. **Service role, API keys de IA, y Resend** son los más críticos.
4. **Anon key, Supabase URL, Sentry DSN** son públicos por diseño, no hace falta rotarlos en filtración.

## Tratamiento de datos personales (Ley 1581 de 2012, Colombia)

CNV Learning maneja datos personales de profesionales en formación de salud. La normativa colombiana de protección de datos personales (Ley 1581 de 2012 y Decreto 1377 de 2013) aplica.

### Datos personales recolectados

- Identificación: nombre completo, email.
- Académicos: profesión, institución, especialización (cuando se llenan).
- De uso: progreso, calificaciones, entregas, foros.
- Técnicos: IP, user agent (en audit logs solo de admin).

### Datos sensibles

- En MVP **no se recolectan datos de salud, biométricos, ni datos sensibles** según la ley colombiana.
- Las entregas de tareas pueden contener casos clínicos como ejercicio académico. **No son historias clínicas reales.** El docente debe instruir a los alumnos a no incluir datos reales de pacientes.

### Consentimiento

Al inscribirse, el alumno acepta la Política de Tratamiento de Datos Personales accesible en `/privacy`. La aceptación se registra con timestamp en `profiles.onboarding_completed`.

### Derechos del titular

El titular puede:

- Conocer qué datos se tienen sobre él (Santiago atiende la solicitud vía email).
- Solicitar actualización o corrección.
- Solicitar eliminación cuando deja de cumplir el propósito.

En MVP la respuesta es manual. En v2 puede haber un panel de "mis datos" con descarga y solicitud de eliminación automatizada.

### Uso operativo vs uso para entrenamiento/research

**Regla dura:** las entregas de los alumnos no se usan para entrenar modelos externos (Gemini, Claude, OpenAI, etc.).

Distinción explícita en la política:

- **Uso operativo:** generar sugerencia de calificación IA, procesar la entrega para guardarla, mostrarla al docente. No requiere consentimiento adicional, es necesario para el servicio.
- **Uso para mejora del servicio:** análisis de calidad de prompts, mejora interna de la plataforma, en datos anonimizados. Se informa en la política.
- **Uso para research o publicación:** requiere consentimiento explícito separado en cada caso. NO aplica en MVP.

Cuando se llama a Gemini para SpeedGrader, el provider de IA en `lib/ai/provider.ts` envía la entrega como input operativo. **No marcamos los datos como "training opt-in"** en la API de Gemini. Esto es decisión técnica documentada.

## Backups y disaster recovery

Ver `DEPLOY.md` sección de backups para procedimiento operativo.

Principio de seguridad: **un backup no existe hasta que se ha restaurado exitosamente.** En el lanzamiento del MVP se ejecuta una prueba de restauración (restaurar a un proyecto de staging) para validar que el backup nativo de Supabase funciona.

## Encriptación

### En tránsito

- HTTPS obligatorio en todos los entornos (development local también vía Vercel preview URLs).
- TLS 1.2+ en todas las conexiones a Supabase, Resend, Gemini.
- HSTS habilitado vía header (ver abajo).
- Cookies de sesión marcadas `HttpOnly`, `Secure`, `SameSite=Lax`. Supabase Auth lo hace por defecto.

### En reposo

- **Base de datos:** Supabase encripta todo en reposo con AES-256 a nivel de disco. No hay configuración adicional.
- **Storage (PDFs, avatares, entregas):** mismo cifrado en reposo provisto por Supabase Storage.
- **Backups:** encriptados con la misma llave maestra del proyecto.
- **Secrets en Vercel:** encriptados con AES-256, accesibles solo en runtime.
- **Variables sensibles a nivel de aplicación (contraseñas):** Supabase Auth las almacena con bcrypt + sal. Nunca se ven en plano, ni en logs, ni en la BD.

### A nivel de aplicación

- Hashes para certificados (SHA-256), no para reversibilidad sino para integridad.
- Si en el futuro se manejan datos sensibles (historia clínica educativa, datos biométricos para research), evaluar cifrado a nivel de columna con `pgcrypto` o KMS externo. **No aplica al MVP.**

## Headers de seguridad

Configurados en `next.config.ts` con `headers()`. Esta es la configuración mínima del MVP, no se difiere:

```typescript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
        },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://*.sentry.io",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://*.supabase.co https://i.ytimg.com",
            "media-src 'self' https://www.youtube.com",
            "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://api.resend.com https://*.sentry.io",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        },
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on',
        },
      ],
    },
  ];
}
```

**Notas sobre la CSP:**

- `frame-ancestors 'none'` previene clickjacking, complementa a `X-Frame-Options: DENY`.
- `'unsafe-inline'` y `'unsafe-eval'` en `script-src` son necesarios para Next.js. En v1.1 evaluamos usar nonces para eliminarlos.
- `frame-src https://www.youtube.com` permite el reproductor embebido. Si cambiamos a Bunny.net en v1.1, se actualiza.
- `connect-src` lista todos los hosts que la app llama desde el navegador (Supabase para datos y realtime, Resend si fuera necesario, Sentry para reportes).

La CSP se valida en el Bloque 3 (layout) y se afina en el Bloque 18 (pulido) si rompe algo.

## CORS

CNV Learning es una app cerrada: el frontend y el backend viven en el mismo dominio (`lms.cnvsystem.com`), así que CORS no aplica para nuestras propias rutas. Pero hay tres escenarios donde sí importa:

### 1. Endpoints públicos sin sesión (verify de certificado)

La ruta `/api/certificates/[id]/verify` (si la creamos en v1.1 como API en lugar de página) debe responder con headers CORS controlados:

```typescript
// En el route handler
export async function GET(request: Request) {
  const response = await getCertificateData(...);
  return new Response(JSON.stringify(response), {
    headers: {
      'Access-Control-Allow-Origin': '*',  // verify es público, OK
      'Access-Control-Allow-Methods': 'GET',
      'Content-Type': 'application/json',
    },
  });
}
```

En MVP la página de verify es Server Component, no API, así que esto no aplica todavía.

### 2. Webhooks entrantes

Webhooks de Resend (bounces, delivery) llegan al endpoint `/api/webhooks/resend`. **No deben tener CORS abierto.** En lugar de CORS, validan firma HMAC con un secret compartido.

### 3. Llamadas a Supabase y Gemini desde el navegador

Supabase y Gemini ya gestionan CORS apropiadamente para sus dominios. No requiere configuración nuestra.

**Regla:** ningún endpoint de CNV Learning tiene `Access-Control-Allow-Origin: *` salvo el de verificación pública de certificados. Cualquier propuesta de relajar CORS pasa por revisión documentada.

## Input sanitization

Validación con Zod previene **datos malformados**. Sanitization previene **inyección de código malicioso**. Son cosas distintas y necesitamos ambas.

### Sanitization de HTML / Markdown

El mayor riesgo de XSS en el LMS son:

1. Contenido de lecciones en markdown (cargado por nosotros, pero igual sanitizamos).
2. Posts y respuestas en foros (escritos por usuarios).
3. Feedback de calificación (escrito por docentes, podría incluir HTML).
4. Nombres y bios en perfiles.

**Estrategia:**

- Renderizamos markdown con `react-markdown` configurado en modo seguro (sin `dangerouslySetInnerHTML`).
- Para campos donde aceptamos HTML enriquecido en v1.1 (editor WYSIWYG futuro), usamos `DOMPurify` en el servidor antes de guardar y opcionalmente en el cliente antes de renderizar.
- Para texto plano (nombres, títulos, bios), NO necesitamos sanitizar al guardar porque React escapa por defecto al renderizar. Validamos longitud y caracteres permitidos con Zod.

```typescript
// modules/forum/validations/create-post.ts
import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(10).max(10000),
  // markdown se renderiza con react-markdown sin allowDangerousHtml
});
```

```typescript
// modules/forum/components/PostBody.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function PostBody({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      // CRÍTICO: sin allowDangerousHtml, sin rehype-raw
      // No se permite HTML inline en posts de usuarios
    >
      {markdown}
    </ReactMarkdown>
  );
}
```

### Sanitization de archivos subidos

Para entregas de tareas, avatares y attachments:

- **Tipos MIME validados** contra una lista blanca (solo `.pdf`, `.docx`, `.jpg`, `.png`, `.webp` según contexto).
- **Tamaño máximo:** 10 MB por archivo en entregas, 2 MB en avatares.
- **Nombre del archivo:** se renombra a UUID en el servidor antes de guardar en Storage. El nombre original se preserva como metadata pero NO se usa como path.
- **No ejecutamos ni renderizamos contenido del archivo en el navegador.** Los PDFs se sirven con `Content-Disposition: attachment` o se abren en visor de PDF nativo, no como HTML.

```typescript
// lib/storage/upload.ts
const ALLOWED_MIME_TYPES = {
  submission: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  avatar: ['image/jpeg', 'image/png', 'image/webp'],
};

export async function uploadFile(input: {
  bucket: 'submissions' | 'avatars';
  file: File;
  userId: string;
}): Promise<Result<string, AppError>> {
  const allowed = ALLOWED_MIME_TYPES[input.bucket];
  if (!allowed.includes(input.file.type)) {
    return { ok: false, error: validationError('FILE_TYPE_NOT_ALLOWED') };
  }
  
  if (input.file.size > MAX_SIZE[input.bucket]) {
    return { ok: false, error: validationError('FILE_TOO_LARGE') };
  }
  
  const ext = input.file.name.split('.').pop()?.toLowerCase();
  const safeName = `${input.userId}/${crypto.randomUUID()}.${ext}`;
  
  // ...
}
```

### SQL injection

PostgreSQL via Supabase es inmune a SQL injection siempre que **no se construyan queries con string concatenation**. La regla es:

- Usar el query builder de Supabase (`.from().select().eq()`) o RPC con parámetros nombrados.
- **Nunca** construir SQL con interpolación de strings provenientes del usuario.
- **Nunca** usar `supabase.rpc('query', { sql: userInput })`.

Esto está protegido por la regla dura #1 (todo acceso a Supabase pasa por repositories).

## Rate limiting

**Cambio respecto a la propuesta inicial: rate limiting va DESDE MVP.** La razón es que un solo bot o usuario malicioso puede agotar nuestros créditos de Gemini, saturar Resend, o intentar fuerza bruta de contraseñas. No es algo que se difiere.

### Implementación con Upstash Ratelimit

Setup en ~10 minutos:

1. Crear cuenta gratuita en Upstash (`https://upstash.com`).
2. Crear una Redis database (Free tier: 10.000 commands/día, suficiente para MVP).
3. Variables de entorno:

```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

4. Instalar:

```bash
npm install @upstash/ratelimit @upstash/redis
```

### Configuración por endpoint

```typescript
// src/lib/ratelimit/index.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const ratelimit = {
  // Auth: login, forgot password
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'rl:auth',
  }),
  
  // SpeedGrader IA (costoso)
  ai: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 h'),
    prefix: 'rl:ai',
  }),
  
  // Foros, posts y replies
  forum: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 h'),
    prefix: 'rl:forum',
  }),
  
  // Default para server actions de mutación
  mutation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    prefix: 'rl:mut',
  }),
};
```

### Aplicación en server actions y route handlers

```typescript
// En cada server action o route handler que muta
import { ratelimit } from '@/lib/ratelimit';
import { headers } from 'next/headers';

export async function loginAction(input: unknown) {
  const ip = headers().get('x-forwarded-for') ?? 'unknown';
  const { success, reset } = await ratelimit.auth.limit(ip);
  
  if (!success) {
    return {
      ok: false,
      error: new AppError(
        'RATE_LIMIT_EXCEEDED',
        `Demasiados intentos. Vuelve a intentar en ${formatDistance(reset)}.`,
        429,
      ),
    };
  }
  
  // ... lógica normal
}
```

### Endpoints con rate limit obligatorio en MVP

| Endpoint | Límite |
|---|---|
| `POST /login` (server action) | 5 intentos / 15 min por IP |
| `POST /forgot-password` (server action) | 3 envíos / 1 h por IP |
| `POST /api/grading/suggest` (SpeedGrader IA) | 20 / 1 h por usuario |
| Crear post o reply en foro | 30 / 1 h por usuario |
| Subir archivo a Storage | 50 / 1 h por usuario |
| Cualquier otra mutación | 100 / 1 min por usuario |

**Identificación del solicitante:**

- Para endpoints sin sesión (login, forgot-password): se usa la IP.
- Para endpoints con sesión: se usa el `userId`, que es más justo (un usuario tras NAT no tumba a otros).

### Defensa en capas

Rate limiting es la primera línea de defensa, pero confiamos también en:

- Supabase Auth rate limit nativo (no podemos bypassear, no podemos configurar mucho).
- Vercel Edge Network (mitigación básica de DDoS).
- Cloudflare (proxy DNS): si en algún momento activamos modo Bot Fight o Under Attack, da una capa más.
- Resend y Gemini: tienen sus propios límites por API key, los respetamos para no agotar el plan.

## Tests de seguridad mínimos

En `tests/policies.test.ts`, validar al menos:

- `canAccessAdmin`: solo admin pasa.
- `canGradeAssignment`: solo profesor del curso pasa, no profesores de otros cursos, no estudiantes.
- `canViewSubmission`: dueño y profesor del curso pasan; otros estudiantes no.
- `canIssueCertificate`: solo admin pasa.
- `canRevokeCertificate`: solo admin pasa.
- `canManageUsers`: solo admin pasa.

Estos tests son la primera línea de "validación automatizada" de la seguridad. Si rompemos una policy, los tests fallan.

## Incident response

En caso de incidente (filtración, comportamiento sospechoso, fallo de seguridad):

1. **Aislar:** revocar el secret comprometido o suspender el usuario sospechoso.
2. **Auditar:** revisar `audit_logs` y logs de Sentry/Vercel para entender alcance.
3. **Notificar:** si hay datos personales comprometidos, notificar a la Superintendencia de Industria y Comercio y a los afectados dentro de los plazos legales.
4. **Documentar:** post-mortem en `docs/incidents/YYYY-MM-DD-titulo.md`.
5. **Mitigar:** aplicar correcciones, agregar tests para que no se repita.

En MVP, el "equipo de respuesta a incidentes" es Santiago. En v2 cuando entren más colaboradores, se formaliza un proceso.
