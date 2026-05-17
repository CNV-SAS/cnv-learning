# Arquitectura de CNV Learning

**Última actualización:** 12 de mayo de 2026
**Estado:** firmado, congelado para MVP

> Este documento es la fuente de verdad arquitectónica. Si el código contradice este documento, el código está equivocado. Si una decisión nueva contradice este documento, este documento se actualiza primero y luego el código.

## Las 10 reglas duras del proyecto

Estas reglas son no negociables durante el MVP y la v1.1. Cambiarlas requiere una revisión formal documentada en un PR aparte.

1. **Ningún acceso directo a Supabase fuera de `data/`.** Toda lectura y escritura pasa por un repositorio del módulo correspondiente. No hay `supabase.from(...)` en componentes, server actions, route handlers, ni services.

2. **Ninguna lógica de negocio en pages, server actions ni route handlers.** Las pages son thin. Las server actions y route handlers solo validan input, verifican autorización, llaman a un service, y retornan el resultado. La lógica vive en services.

3. **Ningún `user.role === ...` fuera de policies.** Toda decisión de autorización pasa por una función explícita en `modules/auth/policies/` o `modules/<dominio>/policies/`. Por ejemplo: `canGradeAssignment(user, assignment)`, no `if (user.role === 'teacher')`.

4. **Ningún `"use client"` innecesario.** Server Components por defecto. `"use client"` solo cuando el componente usa estado local, efectos, event handlers, o APIs del navegador.

5. **Ningún import cruzado entre dominios CNV.** Un módulo de CNV Learning no importa código de ATLAS. ATLAS no importa de CNV Learning. La integración entre dominios va por API, eventos, o contratos compartidos en CNV Core. Ver `BOUNDARIES.md`.

6. **Ningún side effect grande inline en server actions.** Si una acción debe disparar tres cosas (audit, notificación, recálculo), va a un service que orquesta. Si las tres cosas son desacopladas y opcionales, va a eventos.

7. **Ningún tipo global monstruoso.** Los tipos viven en su módulo (`modules/<dominio>/types.ts`). Los tipos generados de la base de datos viven en `src/types/database.generated.ts`. No hay `src/types/domain.ts` enorme.

8. **Ningún evento de negocio crítico sin audit trail.** Calificaciones, emisión y revocación de certificados, cambios de rol, completar curso, eliminaciones de usuario: todos generan un row en `audit_logs` dentro de la misma transacción cuando es posible.

9. **Ningún prompt IA inline.** Todo prompt vive en `modules/<dominio>/ai/prompts/<task>.<version>.ts`. Versionado, aislado, testeable, documentado.

10. **Ninguna llamada externa sin timeout explícito.** Gemini, Resend, webhooks, fetches a APIs externas: todos pasan por `core/http/` o `lib/ai/provider.ts` que aplican timeout obligatorio mediante `AbortSignal.timeout()`. Si alguien hace `fetch()` directo sin wrapper, ESLint lo marca.

## Filosofía

CNV Learning se construye como una **Learning Core Platform** modular. El código se organiza por **dominio de negocio**, no por tipo técnico. Cada módulo es un bounded context con sus propios componentes, lógica, datos y reglas.

Principios rectores:

- **Server-first.** El renderizado predeterminado es en servidor. JavaScript en cliente solo donde aporta valor de UX (interactividad real).
- **Separación de responsabilidades por capa.** Cada capa tiene UNA responsabilidad: las pages componen, las actions/handlers validan y orquestan thin, los services contienen lógica, los repositorios acceden a datos, las policies autorizan.
- **Modularidad por dominio.** Agregar una capability nueva es agregar una carpeta en `modules/`, no abrir 5 carpetas distintas a la vez.
- **Defensa en profundidad.** La seguridad no descansa en una sola capa. RLS + policies + validación + audit.
- **Trazabilidad.** Todo evento de negocio crítico deja rastro. Esto importa para CNV específicamente por compliance educativa.
- **Extensibilidad sin reescritura.** Las tablas, módulos y eventos se diseñan pensando en LCP futura (acreditación, compliance, onboarding), no solo en el LMS de hoy.

## Estructura de carpetas

```
cnv-learning/
├── src/
│   ├── app/                              App Router de Next.js, thin
│   │   ├── (auth)/                       Grupo público
│   │   │   ├── login/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (app)/                        Grupo protegido por middleware
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── learn/[courseId]/
│   │   │   │   ├── page.tsx                          Vista del curso
│   │   │   │   ├── lesson/[lessonId]/page.tsx        Vista de lección
│   │   │   │   ├── forum/page.tsx
│   │   │   │   └── assignments/[assignmentId]/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   ├── notifications/page.tsx
│   │   │   ├── teacher/
│   │   │   │   ├── overview/page.tsx
│   │   │   │   ├── students/page.tsx
│   │   │   │   └── grader/[submissionId]/page.tsx
│   │   │   ├── admin/
│   │   │   │   ├── users/page.tsx
│   │   │   │   ├── stats/page.tsx
│   │   │   │   ├── audit/page.tsx
│   │   │   │   └── notifications/page.tsx
│   │   │   └── layout.tsx                Layout con sidebar adaptativo por rol
│   │   ├── (public)/                     Rutas públicas sin auth
│   │   │   ├── verify/[id]/page.tsx      Verificación de certificado
│   │   │   ├── privacy/page.tsx
│   │   │   ├── terms/page.tsx
│   │   │   └── support/page.tsx
│   │   ├── api/                          Route handlers, solo para casos justificados
│   │   │   ├── grading/suggest/route.ts          SpeedGrader IA (bajo demanda)
│   │   │   ├── certificates/[id]/pdf/route.ts    PDF on-demand streaming
│   │   │   └── webhooks/                          Webhooks externos
│   │   ├── layout.tsx                    Root layout, fuentes y providers
│   │   ├── page.tsx                      Redirige a login o dashboard
│   │   ├── not-found.tsx                 404 con marca
│   │   ├── error.tsx                     Error boundary global
│   │   └── globals.css                   Tailwind + variables CSS
│   │
│   ├── modules/                          Dominio de negocio
│   │   ├── auth/
│   │   │   ├── components/               LoginForm, ResetForm
│   │   │   ├── server/                   Server actions thin
│   │   │   ├── services/                 Lógica de auth (rotación de tokens, etc.)
│   │   │   ├── policies/                 canAccessAdmin, canTeach, etc.
│   │   │   ├── data/                     Repositorio de profiles
│   │   │   ├── validations/              Schemas Zod
│   │   │   └── types.ts
│   │   │
│   │   ├── courses/                      Definición de cursos/módulos/lecciones
│   │   │   ├── components/
│   │   │   ├── server/
│   │   │   ├── services/
│   │   │   ├── policies/
│   │   │   ├── data/
│   │   │   └── types.ts
│   │   │
│   │   ├── enrollments/                  Matrícula de usuarios en cursos
│   │   ├── progress/                     Tracking de avance + insignias
│   │   │
│   │   ├── assignments/                  Tareas, quizzes, calificación
│   │   │   ├── components/
│   │   │   ├── ai/                       Capability IA de assignments
│   │   │   │   ├── prompts/
│   │   │   │   │   └── grade.v1.ts       Prompt versionado
│   │   │   │   ├── schema.ts             Zod del output esperado
│   │   │   │   └── suggest-grade.ts      Función de capability
│   │   │   ├── server/
│   │   │   ├── services/                 grading.ts orquesta
│   │   │   ├── policies/
│   │   │   ├── data/
│   │   │   └── types.ts
│   │   │
│   │   ├── forum/
│   │   ├── certificates/                 Emisión, revocación, verificación, PDF
│   │   ├── notifications/                In-app y email
│   │   ├── admin/                        Gestión de usuarios, stats
│   │   └── audit/                        Audit logs
│   │
│   ├── components/
│   │   ├── ui/                           shadcn primitivos (Button, Input, Card, etc.)
│   │   ├── layout/                       Sidebar, Header, SidebarItem
│   │   └── shared/                       EmptyState, LoadingState, ErrorBoundary
│   │
│   ├── lib/                              Infraestructura transversal
│   │   ├── supabase/
│   │   │   ├── client.ts                 Cliente browser
│   │   │   ├── server.ts                 Cliente server components
│   │   │   ├── admin.ts                  Service role, SOLO server actions/routes
│   │   │   └── middleware.ts             Refresh de sesión
│   │   ├── ai/
│   │   │   ├── provider.ts               callGemini con retry, timeout, telemetry
│   │   │   ├── parsing.ts                JSON parsing defensivo
│   │   │   └── types.ts
│   │   ├── pdf/
│   │   │   └── render.ts                 Wrapper de @react-pdf/renderer
│   │   ├── email/
│   │   │   ├── resend.ts                 Cliente Resend con timeout
│   │   │   └── templates/                Componentes React-email
│   │   ├── utils/
│   │   │   ├── cn.ts                     className helper (clsx + tailwind-merge)
│   │   │   ├── format.ts                 fechas, números, nombres
│   │   │   └── result.ts                 Result<T, E> helpers
│   │   └── constants/
│   │       ├── routes.ts
│   │       └── config.ts
│   │
│   ├── core/                             Infraestructura crítica
│   │   ├── events/
│   │   │   ├── bus.ts                    Event bus in-memory (NO durable)
│   │   │   └── types.ts                  Catálogo de eventos
│   │   ├── logger/
│   │   │   ├── logger.ts                 Wrapper con AsyncLocalStorage
│   │   │   └── context.ts                requestId, userId, traceId
│   │   ├── errors/
│   │   │   ├── classes.ts                AppError y subclases
│   │   │   └── codes.ts                  Catálogo de error codes estables
│   │   └── http/
│   │       └── fetch.ts                  Wrapper con timeout obligatorio
│   │
│   ├── hooks/                            Custom React hooks compartidos
│   ├── types/
│   │   └── database.generated.ts         Generado por Supabase CLI
│   └── proxy.ts                          Edge runtime, refresh sesión, redirects auth
│
├── tests/                                Vitest, tests críticos
│   ├── policies.test.ts
│   ├── progress.test.ts
│   └── certificate.test.ts
│
├── supabase/
│   ├── migrations/                       SQL versionado, forward-only
│   ├── seed.sql                          Seed determinístico
│   └── config.toml
│
├── public/
│   ├── brand/                            logo.svg, logo-mark.svg, sello-cnv.png
│   ├── certificates/
│   │   └── templates/v1/                 Assets congelados del template v1
│   └── images/
│
└── docs/
    ├── MVP.md
    ├── ARCHITECTURE.md                   este archivo
    ├── DATABASE.md
    ├── SECURITY.md
    ├── BOUNDARIES.md
    ├── BRAND.md
    └── DEPLOY.md
```

## Patrones por capa

### Pages y layouts (`app/`)

- Server Components por defecto.
- Solo composición: piden datos a los repositorios o services y los pasan a componentes.
- No contienen lógica de negocio ni validación.
- Si necesitan interactividad, importan un Client Component específico, NO se vuelven Client Component completos.

### Server actions (`modules/<dominio>/server/`)

- Thin layer. Estructura obligatoria:

```typescript
'use server';

import { z } from 'zod';
import { withAuth } from '@/core/auth/with-auth';
import { canGradeAssignment } from '@/modules/assignments/policies';
import { gradingService } from '@/modules/assignments/services/grading';
import type { Result } from '@/lib/utils/result';
import type { AppError } from '@/core/errors/classes';

const schema = z.object({
  submissionId: z.string().uuid(),
  grade: z.number().min(0).max(100),
  feedback: z.string().min(1),
  aiSuggestionId: z.string().uuid().optional(),
});

export async function publishGrade(input: unknown): Promise<Result<void, AppError>> {
  const user = await withAuth();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: validationError(parsed.error) };

  const submission = await submissionsRepo.findById(parsed.data.submissionId);
  if (!submission) return { ok: false, error: notFoundError('SUBMISSION_NOT_FOUND') };

  if (!canGradeAssignment(user, submission)) {
    return { ok: false, error: authorizationError('AUTHZ_CANNOT_GRADE') };
  }

  return gradingService.publish(user, submission, parsed.data);
}
```

### Route handlers (`app/api/`)

Solo cuando server actions no aplican. Casos válidos:
- Webhooks (no son triggered por UI).
- Llamadas a IA bajo demanda con loading visible (SpeedGrader).
- Streams largos (PDFs de certificado).
- Endpoints públicos sin auth (verify de certificado, eventualmente).

Misma disciplina que server actions: validar, autorizar, llamar service, devolver.

### Services (`modules/<dominio>/services/`)

- **Aquí vive la lógica de negocio.**
- Funciones puras cuando es posible.
- Reciben dependencias inyectadas (repositorios, otros services) para testeo.
- Pueden emitir eventos (`events.emit`) o llamar otros services explícitamente.
- Retornan `Result<T, AppError>` o lanzan `AppError` en casos excepcionales.

### Capabilities IA (`modules/<dominio>/ai/`)

Tres archivos típicos:

- `prompts/<task>.<version>.ts`: el prompt versionado, exportado como función que recibe datos del dominio y retorna string.
- `schema.ts`: Zod schema del output esperado del modelo.
- `<task>.ts`: función que orquesta (construir prompt + llamar provider + parsear + validar + retornar).

Ejemplo:

```typescript
// modules/assignments/ai/suggest-grade.ts
import { aiProvider } from '@/lib/ai/provider';
import { gradePromptV1 } from './prompts/grade.v1';
import { gradeOutputSchema } from './schema';

export async function suggestGrade(
  submission: Submission,
  assignment: Assignment,
): Promise<Result<GradeSuggestion, AppError>> {
  const prompt = gradePromptV1({ submission, assignment });
  const response = await aiProvider.complete(prompt, { timeout: 8000, task: 'grading' });
  
  if (!response.ok) return response;
  
  const parsed = gradeOutputSchema.safeParse(response.value);
  if (!parsed.success) {
    return { ok: false, error: domainError('AI_PARSE_FAILED') };
  }
  
  return { ok: true, value: parsed.data };
}
```

### Repositorios (`modules/<dominio>/data/`)

- **Único lugar donde se llama a Supabase.**
- Funciones tipadas que reciben y devuelven entidades del dominio.
- No lógica de negocio. Solo acceso a datos.
- Si una query es repetida, vive aquí.

```typescript
// modules/courses/data/course.repository.ts
export const courseRepository = {
  async findById(id: string): Promise<Course | null> {
    const { data } = await supabase.from('courses').select('*').eq('id', id).single();
    return data ? toCourse(data) : null;
  },
  
  async listForUser(userId: string): Promise<Course[]> {
    const { data } = await supabase
      .from('enrollments')
      .select('course:courses(*)')
      .eq('user_id', userId);
    return data?.map(e => toCourse(e.course)) ?? [];
  },
};
```

### Policies (`modules/<dominio>/policies/`)

- Funciones puras: `(user, resource, context?) => boolean | Promise<boolean>`.
- Nombres explícitos: `canGradeAssignment`, `canViewSubmission`.
- Internamente verifican rol, ownership, estado del recurso.
- Aunque hoy usen RBAC simple, su firma permite migrar a ABAC sin refactor en los call sites.

```typescript
// modules/assignments/policies/can-grade.ts
export function canGradeAssignment(
  user: AuthenticatedUser,
  submission: Submission,
): boolean {
  if (user.role === 'admin') return true;
  if (user.role !== 'teacher') return false;
  // En MVP, cualquier profesor del curso puede calificar
  // En v2 puede haber asignación específica de profesor a alumno
  return submission.course.teacherIds.includes(user.id);
}
```

## Bus de eventos

`src/core/events/bus.ts` implementa un emisor in-memory simple:

```typescript
type Handler<T> = (payload: T) => Promise<void> | void;
const handlers = new Map<string, Handler<any>[]>();

export const events = {
  on<T>(event: string, handler: Handler<T>) {
    const list = handlers.get(event) ?? [];
    list.push(handler);
    handlers.set(event, list);
  },
  
  async emit<T>(event: string, payload: T): Promise<void> {
    const list = handlers.get(event) ?? [];
    const results = await Promise.allSettled(
      list.map(h => Promise.resolve(h(payload)))
    );
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        logger.error('Event handler failed', { event, handlerIndex: i, error: r.reason });
      }
    });
  },
  
  emitDeferred<T>(event: string, payload: T): void {
    // Usar Vercel waitUntil para handlers que pueden esperar después de la response
    after(() => events.emit(event, payload));
  },
};
```

**Importante:** este bus NO es durable. Si el container muere antes de procesar un handler, ese efecto se pierde. Por eso:

- **No usar el bus para workflows críticos no-idempotentes.** Para flujos críticos (emisión de certificado), la mutación principal va inline en la transacción y los efectos secundarios usan el bus solo para audit/notificación, que son tolerantes a pérdida.
- **No usar el bus para procesos largos.** La generación de IA o de PDF no se dispara desde eventos. Se dispara desde un endpoint explícito.
- **Si en v1.1 necesitamos durabilidad real,** migramos a Inngest, Trigger.dev, o una cola en Supabase con triggers.

### Catálogo de eventos del MVP

| Evento | Payload | Handlers |
|---|---|---|
| `user.created` | `{ userId, email, role }` | audit, email de bienvenida (deferred) |
| `lesson.completed` | `{ userId, lessonId, courseId }` | recalcular progreso del módulo y curso, verificar insignia (sync) |
| `assignment.submitted` | `{ submissionId, userId, assignmentId }` | notificar docente in-app, audit (sync), email al docente (deferred) |
| `assignment.graded` | `{ submissionId, gradedBy, gradeId }` | actualizar libro de notas, audit (sync), email al alumno (deferred) |
| `course.completed` | `{ userId, courseId }` | emisión de certificado (sync, dentro de transacción), audit |
| `certificate.issued` | `{ certificateId, userId, courseId }` | notificar in-app, email (deferred), audit |
| `certificate.revoked` | `{ certificateId, revokedBy, reason }` | notificar in-app, email (deferred), audit |
| `role.changed` | `{ userId, oldRole, newRole, changedBy }` | audit (sync), email (deferred) |

## Logger y tracing

`src/core/logger/` usa `AsyncLocalStorage` de Node.js para mantener contexto por request:

```typescript
import { AsyncLocalStorage } from 'async_hooks';

type Context = { requestId: string; userId?: string };
const storage = new AsyncLocalStorage<Context>();

export function withContext<T>(ctx: Context, fn: () => T): T {
  return storage.run(ctx, fn);
}

export const logger = {
  info(msg: string, meta?: Record<string, unknown>) {
    const ctx = storage.getStore();
    console.log(JSON.stringify({ level: 'info', msg, ...ctx, ...meta, ts: new Date().toISOString() }));
  },
  error(msg: string, meta?: Record<string, unknown>) {
    const ctx = storage.getStore();
    console.error(JSON.stringify({ level: 'error', msg, ...ctx, ...meta, ts: new Date().toISOString() }));
    Sentry.captureMessage(msg, { tags: { requestId: ctx?.requestId }, extra: meta });
  },
};
```

Las server actions y route handlers inicializan el contexto al entrar. AsyncLocalStorage funciona perfectamente en Node.js runtime, que es lo que usaremos. **No usar Edge runtime en MVP.**

### Excepción: Edge runtime para el proxy

La única excepción al principio "Node.js para todo" es el archivo `src/proxy.ts` (file convention de Next.js 16, antes `middleware.ts`). Vive en Edge runtime por obligación: Next.js no permite ejecutarlo en Node.js. El proxy es naturaleza network-boundary (corre antes de servir cualquier request), y `@supabase/ssr` está diseñado precisamente para ese runtime, con un helper dedicado (`updateSession`) que refresca tokens de sesión usando solo APIs compatibles con Edge.

Esta excepción está acotada y no se extiende:

- El proxy SOLO refresca sesión y aplica redirects de auth (login si no hay sesión, dashboard si la hay y la ruta es de credenciales).
- NO contiene lógica de negocio, NO accede a repositorios, NO emite eventos, NO valida input. Toda esa lógica vive en Node.js (server components, server actions, route handlers, services).
- El AsyncLocalStorage logger no aplica en el proxy (no es compatible con Edge); las requests originadas en el proxy se trazan implícitamente vía Vercel logs por el request id que la plataforma asigna.
- `src/lib/supabase/middleware.ts` (helper de Supabase SSR) sigue con su nombre histórico: describe función, no convention. Convive con el proxy y se importa desde él.

Cualquier necesidad futura de mover otra capa a Edge requiere actualizar este doc primero (10 reglas duras + esta sección) antes de tocar código.

## Convención de errores

Jerarquía en `src/core/errors/classes.ts`:

```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(code: string, message: string) { super(code, message, 400); }
}

export class AuthenticationError extends AppError {
  constructor(code: string, message: string) { super(code, message, 401); }
}

export class AuthorizationError extends AppError {
  constructor(code: string, message: string) { super(code, message, 403); }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string) { super(code, message, 404); }
}

export class DomainError extends AppError {
  constructor(code: string, message: string) { super(code, message, 422); }
}

export class InfrastructureError extends AppError {
  constructor(code: string, message: string) { super(code, message, 500); }
}
```

Catálogo de códigos estables en `src/core/errors/codes.ts`. Ejemplos:

```typescript
export const ErrorCodes = {
  // Auth
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  
  // Authorization
  AUTHZ_ROLE_REQUIRED: 'AUTHZ_ROLE_REQUIRED',
  AUTHZ_NOT_OWNER: 'AUTHZ_NOT_OWNER',
  AUTHZ_CANNOT_GRADE: 'AUTHZ_CANNOT_GRADE',
  
  // Assignments
  ASSIGNMENT_NOT_FOUND: 'ASSIGNMENT_NOT_FOUND',
  SUBMISSION_NOT_FOUND: 'SUBMISSION_NOT_FOUND',
  SUBMISSION_DEADLINE_PASSED: 'SUBMISSION_DEADLINE_PASSED',
  SUBMISSION_ALREADY_GRADED: 'SUBMISSION_ALREADY_GRADED',
  
  // Lessons
  LESSON_NOT_FOUND: 'LESSON_NOT_FOUND',
  LESSON_NOT_IN_COURSE: 'LESSON_NOT_IN_COURSE',
  
  // Certificates
  CERTIFICATE_NOT_FOUND: 'CERTIFICATE_NOT_FOUND',
  CERTIFICATE_NOT_ELIGIBLE: 'CERTIFICATE_NOT_ELIGIBLE',
  CERTIFICATE_ALREADY_ISSUED: 'CERTIFICATE_ALREADY_ISSUED',
  CERTIFICATE_REVOKED: 'CERTIFICATE_REVOKED',
  
  // AI
  AI_TIMEOUT: 'AI_TIMEOUT',
  AI_PARSE_FAILED: 'AI_PARSE_FAILED',
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  
  // Infrastructure
  DATABASE_ERROR: 'DATABASE_ERROR',
  EMAIL_PROVIDER_ERROR: 'EMAIL_PROVIDER_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
} as const;
```

Server actions retornan `Result<T, AppError>` en lugar de hacer throw. Esto facilita el manejo en componentes cliente sin try/catch repetitivo:

```typescript
type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

## Estrategia de caché e invalidación

Next.js 15 con App Router es **dinámico por defecto**. Esto significa que el problema NO es "cachear sin querer", sino "qué cacheamos explícitamente y cuándo invalidamos".

Política de caché por entidad:

| Entidad | Política | Invalidación |
|---|---|---|
| Profile del usuario | Dinámico, sin caché | N/A |
| Dashboard del estudiante | Dinámico | N/A |
| Vista del curso (estructura) | Cacheado con tag `course:<id>` | Al editar el curso desde admin |
| Lista de módulos y lecciones | Cacheado con tag `course:<id>:structure` | Al editar módulos/lecciones |
| Contenido de lección (markdown, video URL, PDFs) | Cacheado con tag `lesson:<id>` | Al editar la lección |
| Progreso del estudiante | Dinámico | N/A |
| Foros | Dinámico con `revalidate: 30` | N/A (frescura de 30s) |
| Notificaciones | Dinámico | N/A |
| Catálogo público de cursos (futuro) | Cacheado agresivamente | Al cambiar el catálogo |
| Página de verify de certificado | Dinámico | N/A |

Invalidación semántica por evento:

| Evento | Tags a invalidar |
|---|---|
| `lesson.completed` | `user:<id>:progress`, `course:<courseId>:enrollments` |
| `assignment.graded` | `user:<id>:grades`, `course:<courseId>:gradings` |
| `course.completed` | `user:<id>:certificates`, `user:<id>:progress` |
| `lesson.updated` (admin) | `lesson:<id>`, `course:<courseId>:structure` |
| `course.updated` (admin) | `course:<id>`, `course:<id>:structure` |

Los handlers de eventos llaman a `revalidateTag()` cuando corresponde.

## Cuándo usar server action vs route handler

| Caso de uso | Mecanismo |
|---|---|
| Form de login | Server action |
| Marcar lección como completada | Server action |
| Entregar tarea (con archivo) | Server action |
| Publicar nota de tarea | Server action |
| Generar sugerencia IA de calificación | Route handler `POST /api/grading/suggest` |
| Descargar PDF de certificado | Route handler `GET /api/certificates/[id]/pdf` |
| Verificar certificado público | Server Component en `app/(public)/verify/[id]/page.tsx` |
| Webhook de Resend (bounces, etc.) | Route handler |
| Inscribir alumno (admin) | Server action |
| Cambio de rol | Server action |
| Editar perfil con foto | Server action |

## Decisiones diferidas

Estas decisiones están conscientemente fuera del MVP y entran en versiones posteriores:

- **Event bus durable.** En v1.1 evaluamos Inngest o Trigger.dev.
- **ABAC completo.** Hoy RBAC contextual con policies. ABAC cuando aparezcan permisos complejos.
- **Edge runtime.** Hoy todo Node.js. Edge solo si una ruta justifica el costo.
- **Tests E2E con Playwright.** Hoy Vitest unit. E2E en v1.1.
- **Backups externos automatizados.** Hoy backup nativo de Supabase. Dump semanal a Backblaze B2 en v1.1.
- **PostHog para analítica de producto.** En v1.1.
- **Feature flags.** No urgente, evaluar en v2.
- **PWA o app móvil.** Solo si las métricas lo justifican.
- **Cache distribuido (Redis).** Solo si Supabase no escala.

## Disciplina arquitectónica

La degradación de arquitectura es el riesgo real, no la elección de tecnología. Para preservar disciplina:

1. **Toda PR (incluso self-review en MVP) revisa contra las 10 reglas duras.**
2. **Toda migración SQL, policy RLS, evento de dominio, y prompt IA requiere comentario en commit explicando el "por qué", no solo el "qué".**
3. **El archivo `ARCHITECTURE.md` se pasa como contexto a Claude Code en el primer prompt de cada bloque.**
4. **Las decisiones que se desvían de este documento se documentan primero acá, con justificación, y luego se implementan.**

Esta disciplina parece cara hoy. En 6 meses, cuando entren más colaboradores o cuando vuelvas al código tras una pausa, es lo que diferencia un proyecto que crece sano de uno que colapsa en deuda.
