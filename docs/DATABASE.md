# Modelo de datos de CNV Learning

**Última actualización:** 16 de mayo de 2026
**Motor:** PostgreSQL 15+ vía Supabase

## Principios

1. **`auth.users` es solo identidad técnica.** Todo el dominio CNV vive en `public.profiles`. Ver detalle más abajo.
2. **Toda tabla tiene RLS habilitado.** Sin excepción.
3. **Las migraciones son forward-only.** Una migración aplicada nunca se edita. Se crea otra migración encima.
4. **Las RLS policies se versionan junto al schema** en `supabase/migrations/`. Cambiar una policy es crear una migración.
5. **`created_at` y `updated_at` obligatorios** en toda tabla, con `default now()` y trigger automático para `updated_at`.
6. **IDs son `uuid`** con `default gen_random_uuid()` salvo cuando hay otra clave natural justificada.
7. **Nullable explícito.** Si una columna puede ser nula, se documenta por qué.
8. **Enums centrales** se declaran como tipos PostgreSQL (`create type ... as enum`).
9. **El seed es determinístico.** Mismo resultado en cada `supabase db reset`.

## Enums

```sql
create type user_role as enum ('student', 'teacher', 'admin');
create type lesson_type as enum ('video', 'pdf', 'mixed');
create type assignment_type as enum ('file_upload', 'quiz_multiple_choice', 'essay');
create type submission_status as enum ('draft', 'submitted', 'graded', 'returned');
create type notification_kind as enum (
  'graded',
  'announcement_course',
  'announcement_global',
  'certificate_issued',
  'certificate_revoked',
  'submission_received'
);
create type certificate_status as enum ('valid', 'revoked');
```

## Tablas

### `profiles`

Espejo extendido de `auth.users`. Esta es la entidad de usuario del dominio.

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  avatar_url text,
  role user_role not null default 'student',
  professional_license text,
  institution text,
  specialization text,
  bio text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on profiles(role);
create index profiles_email_idx on profiles(email);

comment on table profiles is 'Perfil de usuario CNV. auth.users es solo identidad técnica.';
comment on column profiles.role is 'Simplificación MVP. En v2 puede migrar a tabla memberships con roles contextuales.';
comment on column profiles.professional_license is 'Campo preparado para compliance futura. Nullable en MVP.';
```

**Trigger automático para crear profile al crear user:**

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'student')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

> Esta función aplica la convención de hardening para funciones `security definer` (ver "Hardening de funciones security definer" más abajo): `set search_path = ''` + identificadores calificados con schema. Previene ataques de search path hijacking.

### `courses`

```sql
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  cover_url text,
  is_published boolean not null default false,
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_slug_idx on courses(slug);
create index courses_published_idx on courses(is_published);
```

### `course_teachers`

Relación N:N entre cursos y profesores. Un curso puede tener varios profesores, un profesor varios cursos.

```sql
create table public.course_teachers (
  course_id uuid not null references courses(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (course_id, teacher_id)
);

create index course_teachers_teacher_idx on course_teachers(teacher_id);
```

### `modules`

```sql
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  description text,
  position int not null,
  weight numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position)
);

create index modules_course_idx on modules(course_id);
```

### `lessons`

```sql
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  title text not null,
  type lesson_type not null,
  content_markdown text,
  video_url text,
  position int not null,
  duration_minutes int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, position)
);

create index lessons_module_idx on lessons(module_id);
```

### `lesson_attachments`

PDFs y otros archivos adjuntos a una lección.

```sql
create table public.lesson_attachments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  storage_path text not null,
  display_name text not null,
  mime_type text not null,
  size_bytes int not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index lesson_attachments_lesson_idx on lesson_attachments(lesson_id);
```

### `enrollments`

```sql
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  enrolled_by uuid references profiles(id),
  is_active boolean not null default true,
  unique (user_id, course_id)
);

create index enrollments_user_idx on enrollments(user_id);
create index enrollments_course_idx on enrollments(course_id);
```

### `lesson_progress`

```sql
create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index lesson_progress_user_idx on lesson_progress(user_id);
create index lesson_progress_lesson_idx on lesson_progress(lesson_id);
```

### `assignments`

```sql
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  title text not null,
  description text,
  type assignment_type not null,
  due_at timestamptz,
  max_score numeric not null default 100,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assignments_module_idx on assignments(module_id);
```

### `quiz_questions`

Para quizzes de opción múltiple.

```sql
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  prompt text not null,
  position int not null,
  points numeric not null default 1,
  created_at timestamptz not null default now(),
  unique (assignment_id, position)
);

create table public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references quiz_questions(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,
  position int not null,
  unique (question_id, position)
);

create index quiz_options_question_idx on quiz_options(question_id);
```

### `submissions`

```sql
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status submission_status not null default 'draft',
  submitted_at timestamptz,
  storage_path text,
  essay_text text,
  quiz_answers jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, user_id)
);

create index submissions_user_idx on submissions(user_id);
create index submissions_assignment_idx on submissions(assignment_id);
create index submissions_status_idx on submissions(status);
```

### `gradings`

Calificación final, siempre puesta por un humano.

```sql
create table public.gradings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references submissions(id) on delete cascade,
  graded_by uuid not null references profiles(id),
  final_grade numeric not null,
  feedback text not null,
  ai_suggestion_id uuid references ai_grading_suggestions(id),
  graded_at timestamptz not null default now()
);

create index gradings_graded_by_idx on gradings(graded_by);
```

### `ai_grading_suggestions`

Sugerencias de IA persistidas, una entrega puede tener varias sugerencias (cada "regenerar" crea una nueva).

```sql
create table public.ai_grading_suggestions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  generated_by uuid not null references profiles(id),
  provider text not null,
  model text not null,
  prompt_version text not null,
  suggested_grade numeric,
  generated_feedback text,
  raw_response jsonb,
  status text not null,
  latency_ms int,
  cost_tokens int,
  generated_at timestamptz not null default now()
);

create index ai_suggestions_submission_idx on ai_grading_suggestions(submission_id);
create index ai_suggestions_generated_by_idx on ai_grading_suggestions(generated_by);

comment on column ai_grading_suggestions.status is 'success | timeout | parse_failed | provider_error';
comment on column ai_grading_suggestions.prompt_version is 'Identificador semántico, ej. "grade.v1", "grade.v2"';
```

### `forums`

Cada curso tiene foros predefinidos (presentación, dudas).

```sql
create table public.forums (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (course_id, slug)
);

create index forums_course_idx on forums(course_id);
```

### `forum_threads`

```sql
create table public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  forum_id uuid not null references forums(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index forum_threads_forum_idx on forum_threads(forum_id);
create index forum_threads_author_idx on forum_threads(author_id);
```

### `forum_replies`

```sql
create table public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references forum_threads(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index forum_replies_thread_idx on forum_replies(thread_id);
```

### `announcements`

```sql
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  course_id uuid references courses(id) on delete cascade,
  author_id uuid not null references profiles(id),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint scope_check check (scope in ('course', 'global'))
);

create index announcements_course_idx on announcements(course_id);
create index announcements_scope_idx on announcements(scope);
```

### `notifications`

In-app. El componente bell del header lee de aquí.

```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind notification_kind not null,
  title text not null,
  body text,
  link text,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications(user_id);
create index notifications_unread_idx on notifications(user_id, read_at) where read_at is null;
```

### `certificates`

Entidad institucional verificable. El PDF se genera on-demand desde esta entidad.

```sql
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references profiles(id),
  revoked_reason text,
  hash text not null,
  template_version text not null default 'v1',
  status certificate_status not null default 'valid',
  unique (user_id, course_id)
);

create index certificates_user_idx on certificates(user_id);
create index certificates_status_idx on certificates(status);

comment on column certificates.template_version is 'Identifica el template histórico. Al regenerar el PDF, se usa esta versión, no la actual.';
comment on column certificates.hash is 'SHA-256(user_id || course_id || issued_at || template_version)';
```

### `audit_logs`

```sql
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  actor_email text,
  event text not null,
  resource_type text,
  resource_id text,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_idx on audit_logs(actor_id);
create index audit_logs_event_idx on audit_logs(event);
create index audit_logs_resource_idx on audit_logs(resource_type, resource_id);
create index audit_logs_created_idx on audit_logs(created_at desc);
```

### Triggers de `updated_at`

```sql
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Aplicado a cada tabla con updated_at
create trigger set_updated_at_profiles
  before update on profiles
  for each row execute function set_updated_at();

-- (Repetir para courses, modules, lessons, assignments, submissions, forum_threads)
```

## RLS Policies

Todas las tablas tienen RLS habilitado. Las policies son la línea de defensa principal contra accesos no autorizados.

### Helper: rol del usuario actual

```sql
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;
```

### Helper: enrollment activo

```sql
create or replace function public.is_enrolled(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.enrollments
    where user_id = auth.uid() and course_id = p_course_id and is_active = true
  )
$$;
```

### Helper: profesor del curso

```sql
create or replace function public.is_course_teacher(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.course_teachers
    where teacher_id = auth.uid() and course_id = p_course_id
  )
$$;
```

### Hardening de funciones `security definer`

**Convención obligatoria:** toda función plpgsql o SQL declarada con `security definer` debe incluir `set search_path = ''` y calificar todos los identificadores con su schema (`public.profiles`, `public.user_role`, `auth.uid()`, etc.).

**Por qué:** una función `security definer` se ejecuta con los privilegios del owner (típicamente `postgres`), no del caller. Si el `search_path` queda como default (`"$user", public`), un actor con permiso a crear objetos en otro schema accesible podría introducir versiones maliciosas de tipos o tablas que la función resolvería por path, ejecutando código no autorizado con privilegios elevados. Fijar `search_path = ''` y calificar todo previene este vector (search path hijacking).

**Aplica a:**
- `public.handle_new_user` (trigger automático de `auth.users` → `profiles`).
- `public.current_user_role`, `public.is_enrolled`, `public.is_course_teacher` (helpers RLS).
- Cualquier futura función `security definer` (ej. `core/audit/log` RPCs si se modelan como funciones SQL, generadores de hash de certificados, etc.).

**No aplica a:**
- Funciones plpgsql sin `security definer` (corren con privilegios del caller). Ej. `public.set_updated_at` es trigger function plain, no necesita hardening.
- Funciones builtin de Supabase/Postgres (`auth.uid()`, `now()`, etc.).

### Policies por tabla

Todas las 21 tablas del schema `public` tienen RLS habilitado (`alter table ... enable row level security`, se omite en los bloques por brevedad). Sin policy permissive aplicable, una query devuelve filas vacías (anon) o falla (authenticated tratando de mutar). Las policies se invocan con identificadores calificados con `public.<helper>` cuando llaman a los helpers, por coherencia con el hardening de `security definer`.

#### `profiles` (6 policies)

```sql
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
  for select using (public.current_user_role() = 'admin');

create policy "Teachers can view enrolled students" on public.profiles
  for select using (
    public.current_user_role() = 'teacher'
    and exists(
      select 1 from public.enrollments e
      join public.course_teachers ct on ct.course_id = e.course_id
      where e.user_id = profiles.id and ct.teacher_id = auth.uid()
    )
  );

create policy "Enrolled students view their course teachers" on public.profiles
  for select using (
    role = 'teacher'
    and exists(
      select 1 from public.course_teachers ct
      join public.enrollments e on e.course_id = ct.course_id
      where ct.teacher_id = profiles.id and e.user_id = auth.uid()
    )
  );

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can update any profile" on public.profiles
  for update using (public.current_user_role() = 'admin');

-- Sin INSERT/DELETE: solo service role. handle_new_user cubre el caso normal de creacion.
```

La policy "Enrolled students view their course teachers" permite que un estudiante lea el `profile` del docente de su curso (necesario para mostrar "Tu docente: {full_name}" en UI de Bloque 4). Guard `role = 'teacher'` previene exposición indirecta de otros roles.

#### `courses` (4 policies, restringidas a `authenticated`)

```sql
create policy "Authenticated users view published courses" on public.courses
  for select to authenticated using (is_published = true);

create policy "Enrolled users view their courses" on public.courses
  for select to authenticated using (public.is_enrolled(id));

create policy "Teachers view their assigned courses" on public.courses
  for select to authenticated using (public.is_course_teacher(id));

create policy "Admins manage courses" on public.courses
  for all to authenticated using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
```

MVP no expone catálogo a anon. La policy de anon se agrega en v2 si se implementa landing pública con catálogo abierto.

#### `course_teachers` (4 policies)

```sql
create policy "Users view own teaching assignments" on public.course_teachers
  for select using (teacher_id = auth.uid());

create policy "Enrolled students see who teaches their course" on public.course_teachers
  for select using (public.is_enrolled(course_id));

create policy "Admins view all teaching assignments" on public.course_teachers
  for select using (public.current_user_role() = 'admin');

create policy "Admins manage course_teachers" on public.course_teachers
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
```

`teacher_id` se expone a estudiantes enrolled deliberadamente (necesitan saber quién es su docente). El `profile` del docente se resuelve via la policy correspondiente en `profiles`.

#### `modules` (3 policies)

```sql
create policy "Enrolled students view modules of their courses" on public.modules
  for select using (public.is_enrolled(course_id));

create policy "Teachers view modules of their courses" on public.modules
  for select using (public.is_course_teacher(course_id));

create policy "Admins manage modules" on public.modules
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
```

#### `lessons` (3 policies)

```sql
create policy "Enrolled students view lessons" on public.lessons
  for select using (
    exists(
      select 1 from public.modules m
      where m.id = lessons.module_id and public.is_enrolled(m.course_id)
    )
  );

create policy "Teachers view lessons of their courses" on public.lessons
  for select using (
    exists(
      select 1 from public.modules m
      where m.id = lessons.module_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Admins manage lessons" on public.lessons
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
```

#### `lesson_attachments` (3 policies)

```sql
create policy "Enrolled students view attachments of their lessons" on public.lesson_attachments
  for select using (
    exists(
      select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      where l.id = lesson_attachments.lesson_id and public.is_enrolled(m.course_id)
    )
  );

create policy "Teachers view attachments of their course lessons" on public.lesson_attachments
  for select using (
    exists(
      select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      where l.id = lesson_attachments.lesson_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Admins manage lesson_attachments" on public.lesson_attachments
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
```

La lógica duplica las storage policies del bucket `lesson-materials`: ambas capas (metadata SQL + blob Storage) validan enrollment para defensa en profundidad.

#### `enrollments` (4 policies)

```sql
create policy "Users view own enrollments" on public.enrollments
  for select using (user_id = auth.uid());

create policy "Teachers view enrollments of their courses" on public.enrollments
  for select using (public.is_course_teacher(course_id));

create policy "Admins view all enrollments" on public.enrollments
  for select using (public.current_user_role() = 'admin');

create policy "Admins manage enrollments" on public.enrollments
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
```

#### `lesson_progress` (4 policies)

```sql
create policy "Users view own progress" on public.lesson_progress
  for select using (user_id = auth.uid());

create policy "Teachers view progress of their course students" on public.lesson_progress
  for select using (
    exists(
      select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      where l.id = lesson_progress.lesson_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Admins view all progress" on public.lesson_progress
  for select using (public.current_user_role() = 'admin');

create policy "Users mark own lesson progress" on public.lesson_progress
  for insert with check (
    user_id = auth.uid()
    and exists(
      select 1 from public.lessons l
      join public.modules m on m.id = l.module_id
      where l.id = lesson_progress.lesson_id and public.is_enrolled(m.course_id)
    )
  );
```

INSERT lleva doble check (`user_id = auth.uid()` AND `is_enrolled`): bloquea marcar progreso en lecciones de cursos no enrolled.

#### `assignments` (3 policies)

```sql
create policy "Enrolled students view assignments of their courses" on public.assignments
  for select using (
    exists(
      select 1 from public.modules m
      where m.id = assignments.module_id and public.is_enrolled(m.course_id)
    )
  );

create policy "Teachers view assignments of their courses" on public.assignments
  for select using (
    exists(
      select 1 from public.modules m
      where m.id = assignments.module_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Admins manage assignments" on public.assignments
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
```

#### `quiz_questions` (3 policies)

```sql
create policy "Enrolled students view quiz questions" on public.quiz_questions
  for select using (
    exists(
      select 1 from public.assignments a
      join public.modules m on m.id = a.module_id
      where a.id = quiz_questions.assignment_id and public.is_enrolled(m.course_id)
    )
  );

create policy "Teachers view quiz questions" on public.quiz_questions
  for select using (
    exists(
      select 1 from public.assignments a
      join public.modules m on m.id = a.module_id
      where a.id = quiz_questions.assignment_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Admins manage quiz_questions" on public.quiz_questions
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
```

Las preguntas son contenido del quiz, los estudiantes enrolled las leen normalmente. Las opciones tienen tratamiento aparte (ver `quiz_options`).

#### `quiz_options` (2 policies, sin SELECT para estudiantes)

```sql
create policy "Teachers view options of their course quizzes" on public.quiz_options
  for select using (
    exists(
      select 1 from public.quiz_questions q
      join public.assignments a on a.id = q.assignment_id
      join public.modules m on m.id = a.module_id
      where q.id = quiz_options.question_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Admins manage quiz_options" on public.quiz_options
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
```

Sin policy SELECT para estudiantes (acceso bloqueado): la columna `is_correct` es la respuesta correcta del quiz, exponerla trivializa el examen. Ver "Campos secretos en RLS" abajo.

#### Campos secretos en RLS

Postgres RLS opera a nivel de fila, **no de columna**. Cuando una tabla tiene un campo que solo ciertos roles deben leer (mientras otros campos de la misma fila son legítimamente públicos), RLS por sí solo no alcanza. El patrón estándar del proyecto:

1. **Bloquear SELECT** a los roles que no deben ver el campo secreto.
2. **Servir el dato sin el campo secreto** desde un route handler server-side usando `lib/supabase/admin.ts` (service role) para leer y filtrar antes de enviar al cliente.

**Caso actual: `quiz_options.is_correct`.**
- Estudiantes sin policy SELECT → cualquier query directa del cliente falla/devuelve cero.
- El quiz player (Bloque 7) consume un route handler tipo `GET /api/quizzes/{id}/play` que lee las opciones server-side, **omite `is_correct`** del payload, y devuelve el resto.
- La calificación automática vive en otro route handler `POST /api/quizzes/{id}/submit` que compara respuestas contra `is_correct` server-side, persiste la `submission` + `grading`, y devuelve la nota al cliente.

**Asimetría intencional con `quiz_questions`:** las preguntas SÍ tienen SELECT para estudiantes (no contienen info secreta). En el quiz player conviene unificar el acceso vía el mismo route handler para evitar race conditions, pero técnicamente solo `quiz_options` requiere protección.

**Casos futuros a evaluar con este patrón:** `ai_grading_suggestions.raw_response` si contiene info que no debe filtrarse a estudiantes (en MVP los estudiantes sin SELECT igual no la ven, pero si en v2 se relaja, evaluar este patrón).

#### `submissions` (5 policies)

```sql
create policy "Students view own submissions" on public.submissions
  for select using (user_id = auth.uid());

create policy "Students create own submissions" on public.submissions
  for insert with check (user_id = auth.uid());

create policy "Students update own draft submissions" on public.submissions
  for update using (user_id = auth.uid() and status = 'draft')
  with check (user_id = auth.uid());

create policy "Teachers view submissions of their courses" on public.submissions
  for select using (
    exists(
      select 1 from public.assignments a
      join public.modules m on m.id = a.module_id
      where a.id = submissions.assignment_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Admins view all submissions" on public.submissions
  for select using (public.current_user_role() = 'admin');
```

UPDATE con guard `status = 'draft'`: el estudiante puede editar su entrega solo mientras esté en draft (también puede cambiar el status de `draft` a `submitted`, lo cual sale del filtro `using` pero entra en `with check`).

#### `gradings` (5 policies)

```sql
create policy "Students view gradings of own submissions" on public.gradings
  for select using (
    exists(
      select 1 from public.submissions s
      where s.id = gradings.submission_id and s.user_id = auth.uid()
    )
  );

create policy "Teachers create gradings for their courses" on public.gradings
  for insert with check (
    graded_by = auth.uid()
    and exists(
      select 1 from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      join public.modules m on m.id = a.module_id
      where s.id = gradings.submission_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Teachers update own gradings" on public.gradings
  for update using (graded_by = auth.uid())
  with check (graded_by = auth.uid());

create policy "Teachers view gradings of their courses" on public.gradings
  for select using (
    exists(
      select 1 from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      join public.modules m on m.id = a.module_id
      where s.id = gradings.submission_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Admins view all gradings" on public.gradings
  for select using (public.current_user_role() = 'admin');
```

Las dos últimas policies son críticas: sin "Teachers view gradings of their courses", el docente no puede leer la calificación que él mismo insertó (la UI del panel docente fallaría). Sin "Admins view all gradings", el panel admin de Bloque 14 requeriría service role.

#### `ai_grading_suggestions` (3 policies)

```sql
create policy "Teachers create AI suggestions for their courses" on public.ai_grading_suggestions
  for insert with check (
    generated_by = auth.uid()
    and exists(
      select 1 from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      join public.modules m on m.id = a.module_id
      where s.id = ai_grading_suggestions.submission_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Teachers view AI suggestions for their courses" on public.ai_grading_suggestions
  for select using (
    exists(
      select 1 from public.submissions s
      join public.assignments a on a.id = s.assignment_id
      join public.modules m on m.id = a.module_id
      where s.id = ai_grading_suggestions.submission_id and public.is_course_teacher(m.course_id)
    )
  );

create policy "Admins view all AI suggestions" on public.ai_grading_suggestions
  for select using (public.current_user_role() = 'admin');
```

Sin UPDATE/DELETE: las sugerencias son inmutables por diseño (tabla sin `updated_at`). Sin SELECT para estudiantes: solo ven `gradings.feedback` (la calificación final humana), no las sugerencias IA crudas.

#### `forums` (3 policies)

```sql
create policy "Enrolled students view forums of their courses" on public.forums
  for select using (public.is_enrolled(course_id));

create policy "Teachers view forums of their courses" on public.forums
  for select using (public.is_course_teacher(course_id));

create policy "Admins manage forums" on public.forums
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
```

Sin INSERT por user: los foros se crean en el seed cuando se crea el curso. Crear foros ad-hoc desde UI no entra en MVP; en v2 se evalúa.

#### `forum_threads` (6 policies)

```sql
create policy "Enrolled students view forum threads" on public.forum_threads
  for select using (
    exists(
      select 1 from public.forums f
      where f.id = forum_threads.forum_id and public.is_enrolled(f.course_id)
    )
  );

create policy "Teachers view forum threads of their courses" on public.forum_threads
  for select using (
    exists(
      select 1 from public.forums f
      where f.id = forum_threads.forum_id and public.is_course_teacher(f.course_id)
    )
  );

create policy "Enrolled students create forum threads" on public.forum_threads
  for insert with check (
    author_id = auth.uid()
    and exists(
      select 1 from public.forums f
      where f.id = forum_threads.forum_id and public.is_enrolled(f.course_id)
    )
  );

create policy "Teachers create forum threads of their courses" on public.forum_threads
  for insert with check (
    author_id = auth.uid()
    and exists(
      select 1 from public.forums f
      where f.id = forum_threads.forum_id and public.is_course_teacher(f.course_id)
    )
  );

create policy "Authors update own threads" on public.forum_threads
  for update using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "Admins manage forum threads" on public.forum_threads
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
```

Threads tienen `updated_at` (autor puede editar). Sin DELETE por autor: admin lo hace via service role si se requiere moderación.

#### `forum_replies` (5 policies)

```sql
create policy "Enrolled students view forum replies" on public.forum_replies
  for select using (
    exists(
      select 1 from public.forum_threads t
      join public.forums f on f.id = t.forum_id
      where t.id = forum_replies.thread_id and public.is_enrolled(f.course_id)
    )
  );

create policy "Teachers view forum replies of their courses" on public.forum_replies
  for select using (
    exists(
      select 1 from public.forum_threads t
      join public.forums f on f.id = t.forum_id
      where t.id = forum_replies.thread_id and public.is_course_teacher(f.course_id)
    )
  );

create policy "Enrolled students reply to forum threads" on public.forum_replies
  for insert with check (
    author_id = auth.uid()
    and exists(
      select 1 from public.forum_threads t
      join public.forums f on f.id = t.forum_id
      where t.id = forum_replies.thread_id and public.is_enrolled(f.course_id)
    )
  );

create policy "Teachers reply to forum threads of their courses" on public.forum_replies
  for insert with check (
    author_id = auth.uid()
    and exists(
      select 1 from public.forum_threads t
      join public.forums f on f.id = t.forum_id
      where t.id = forum_replies.thread_id and public.is_course_teacher(f.course_id)
    )
  );

create policy "Admins manage forum replies" on public.forum_replies
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
```

Replies sin UPDATE: son inmutables por diseño (tabla sin `updated_at`). Editar implica nueva reply.

#### `announcements` (5 policies)

```sql
create policy "Authenticated users view global announcements" on public.announcements
  for select to authenticated using (scope = 'global');

create policy "Enrolled students view course announcements" on public.announcements
  for select using (scope = 'course' and public.is_enrolled(course_id));

create policy "Teachers view announcements of their courses" on public.announcements
  for select using (scope = 'course' and public.is_course_teacher(course_id));

create policy "Teachers create course announcements" on public.announcements
  for insert with check (
    scope = 'course'
    and author_id = auth.uid()
    and public.is_course_teacher(course_id)
  );

create policy "Admins manage announcements" on public.announcements
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
```

Globales visibles para todos los authenticated (por definición van a toda la plataforma). Course-scoped filtran por enrollment/teaching. INSERT global solo via admin manage.

#### `notifications` (3 policies)

```sql
create policy "Users view own notifications" on public.notifications
  for select using (user_id = auth.uid());

create policy "Users update own notifications" on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins view all notifications" on public.notifications
  for select using (public.current_user_role() = 'admin');
```

Sin INSERT por user: las notificaciones las genera el sistema desde service role (handlers de eventos `assignment.graded`, `course.completed`, etc.). UPDATE propio sirve para marcar `read_at`. Sin DELETE: se mantienen para histórico.

#### `certificates` (2 policies)

```sql
create policy "Students view own certificates" on public.certificates
  for select using (user_id = auth.uid());

create policy "Admins manage certificates" on public.certificates
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
```

La verificación pública `/verify/<id>` NO usa RLS, va via service role en route handler que devuelve solo nombre, curso, fecha, status.

#### `audit_logs` (1 policy)

```sql
create policy "Admins read audit logs" on public.audit_logs
  for select using (public.current_user_role() = 'admin');
```

Sin INSERT/UPDATE/DELETE: inserts solo desde service role (`core/audit/log.ts` usa `lib/supabase/admin.ts`). Inmutabilidad por diseño (regla operativa de seguridad).

### Buckets de Storage

```sql
-- bucket: avatars (público)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

create policy "Avatars are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Users upload own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- bucket: lesson-materials (privado, requiere enrollment)
insert into storage.buckets (id, name, public) values ('lesson-materials', 'lesson-materials', false);

create policy "Enrolled users read lesson materials" on storage.objects
  for select using (
    bucket_id = 'lesson-materials'
    and exists(
      select 1 from lesson_attachments la
      join lessons l on l.id = la.lesson_id
      join modules m on m.id = l.module_id
      where la.storage_path = name and is_enrolled(m.course_id)
    )
  );

-- bucket: submissions (privado, solo dueño + docente)
insert into storage.buckets (id, name, public) values ('submissions', 'submissions', false);

create policy "Users upload own submissions" on storage.objects
  for insert with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users read own submissions" on storage.objects
  for select using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Teachers read submissions of their courses" on storage.objects
  for select using (
    bucket_id = 'submissions'
    and current_user_role() in ('teacher', 'admin')
  );
```

## Seed determinístico

`supabase/seed.ts` (script TypeScript ejecutado con `pnpm dlx tsx supabase/seed.ts`) crea el estado inicial reproducible:

- 1 admin: Santiago, `sau.idk001@gmail.com`.
- 1 docente de prueba: `sau.idk001+teacher@gmail.com`.
- 1 estudiante de prueba: `sau.idk001+student@gmail.com`.
- 1 curso: Diplomado de Medicina Bioeléctrica y Sistema ANI BIS-E.
- 10 módulos con títulos del prototipo original.
- 3 lecciones placeholder por módulo (con video URL de YouTube placeholder y attachment PDF placeholder).
- 1 tarea por módulo (3 file_upload, 4 essay, 3 quiz_multiple_choice).
- Foros: presentación y dudas, creados vacíos.
- Enrollment del estudiante de prueba al curso.
- Asignación del docente de prueba al curso.

Los 3 auth users se crean vía `supabase.auth.admin.createUser()` con UUIDs fijos (patrón `00000000-0000-0000-0000-XXXXXXXXXXXX`) y `email_confirm: true`. El trigger `handle_new_user` materializa los `profiles` automáticamente leyendo `role` y `full_name` del `user_metadata`. El resto de la data (curso, módulos, lecciones, etc.) se inserta con service role bypaseando RLS.

Passwords se leen de env vars `SEED_ADMIN_PASSWORD`, `SEED_TEACHER_PASSWORD`, `SEED_STUDENT_PASSWORD` (documentadas en `.env.local.example` sin valor, configuradas en `.env.local` local). El seed asume BD vacía (no idempotente). Uso normal post-reset:

```bash
$env:NEXT_PUBLIC_SUPABASE_URL = ...
$env:SUPABASE_SERVICE_ROLE_KEY = ...
$env:SEED_ADMIN_PASSWORD = ...
$env:SEED_TEACHER_PASSWORD = ...
$env:SEED_STUDENT_PASSWORD = ...
pnpm dlx tsx supabase/seed.ts
```

Mismo `.env.local` → mismo resultado en cada ejecución (UUIDs fijos), lo cual permite reproducir bugs y demos.

## Migraciones

Convención de nombres: `NNNN_descripción_corta.sql` con N de 4 dígitos (0001, 0002, etc.).

Migraciones aplicadas al cierre del Bloque 1:

```
supabase/migrations/
├── 0001_enums.sql
├── 0002_profiles.sql
├── 0003_courses_and_teachers.sql
├── 0004_modules_lessons.sql
├── 0005_lesson_attachments.sql
├── 0006_enrollments_progress.sql
├── 0007_assignments_quizzes.sql
├── 0008_submissions_gradings.sql
├── 0009_ai_grading_suggestions.sql
├── 0010_forums.sql
├── 0011_announcements_notifications.sql
├── 0012_certificates.sql
├── 0013_audit_logs.sql
├── 0014_rls_helpers.sql
├── 0015_storage_buckets.sql
├── 0016_triggers_updated_at.sql
├── 0017_rls_profile_content.sql
├── 0018_rls_enrollments_assignments.sql
├── 0019_rls_submissions.sql
├── 0020_rls_remaining.sql
└── 0021_rls_students_view_teachers.sql
```

**Orden importante por dependencias:** los helpers RLS (0014) se crean **antes** que las storage policies (0015) porque las storage policies de los buckets `lesson-materials` y `submissions` consumen `public.is_enrolled` y `public.current_user_role`. Los triggers `updated_at` (0016) van después porque son independientes. Las RLS de tablas (0017-0020) cierran la capa de autorización. La 0021 cierra el gap detectado en el smoke test de cierre de Bloque 1.

**Regla dura:** una vez aplicada en producción, una migración no se modifica. Si necesitas cambiar algo, creas una nueva migración.

**Cada migración tiene comentario al inicio explicando el "por qué":**

```sql
-- Migration: 0009_ai_grading_suggestions
-- Why: SpeedGrader IA persiste sugerencias para trazabilidad,
-- evitar regenerar al recargar, y permitir análisis posterior
-- de calidad de prompts (compare v1 vs v2 sobre mismas entregas).

create table public.ai_grading_suggestions (
  ...
);
```

## Generación de tipos TypeScript

Tras cada cambio de migración, regenerar tipos contra la BD remota linkeada:

```powershell
$env:SUPABASE_ACCESS_TOKEN = (Select-String -Path .env.local -Pattern '^SUPABASE_ACCESS_TOKEN=(.+)$').Matches.Groups[1].Value
$content = (pnpm dlx supabase gen types typescript --linked) -join "`n"
[System.IO.File]::WriteAllText((Resolve-Path 'src\types').Path + '\database.generated.ts', $content, [System.Text.UTF8Encoding]::new($false))
```

El patrón con `WriteAllText` + `UTF8Encoding($false)` evita que PowerShell 5.1 escriba el archivo con BOM UTF-16 LE (ESLint lo parsearía como binario). Estos tipos NO se editan a mano y se incluyen en git.
