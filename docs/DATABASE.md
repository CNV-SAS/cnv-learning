# Modelo de datos de CNV Learning

**Última actualización:** 12 de mayo de 2026
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
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

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
returns user_role
language sql stable security definer
as $$
  select role from profiles where id = auth.uid()
$$;
```

### Helper: enrollment activo

```sql
create or replace function public.is_enrolled(p_course_id uuid)
returns boolean
language sql stable security definer
as $$
  select exists(
    select 1 from enrollments
    where user_id = auth.uid() and course_id = p_course_id and is_active = true
  )
$$;
```

### Helper: profesor del curso

```sql
create or replace function public.is_course_teacher(p_course_id uuid)
returns boolean
language sql stable security definer
as $$
  select exists(
    select 1 from course_teachers
    where teacher_id = auth.uid() and course_id = p_course_id
  )
$$;
```

### Policies por tabla (muestra representativa)

**profiles:**

```sql
alter table profiles enable row level security;

create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Admins can view all profiles" on profiles
  for select using (current_user_role() = 'admin');

create policy "Teachers can view enrolled students" on profiles
  for select using (
    current_user_role() = 'teacher'
    and exists(
      select 1 from enrollments e
      join course_teachers ct on ct.course_id = e.course_id
      where e.user_id = profiles.id and ct.teacher_id = auth.uid()
    )
  );

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can update any profile" on profiles
  for update using (current_user_role() = 'admin');

-- Insert and delete solo por service role (no policy = no acceso desde anon/authenticated)
```

**enrollments:**

```sql
alter table enrollments enable row level security;

create policy "Users view own enrollments" on enrollments
  for select using (user_id = auth.uid());

create policy "Teachers view enrollments of their courses" on enrollments
  for select using (is_course_teacher(course_id));

create policy "Admins view all enrollments" on enrollments
  for select using (current_user_role() = 'admin');

create policy "Admins manage enrollments" on enrollments
  for all using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');
```

**lessons:**

```sql
alter table lessons enable row level security;

create policy "Enrolled students view lessons" on lessons
  for select using (
    exists(
      select 1 from modules m
      where m.id = lessons.module_id and is_enrolled(m.course_id)
    )
  );

create policy "Teachers view lessons of their courses" on lessons
  for select using (
    exists(
      select 1 from modules m
      where m.id = lessons.module_id and is_course_teacher(m.course_id)
    )
  );

create policy "Admins manage lessons" on lessons
  for all using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');
```

**submissions:**

```sql
alter table submissions enable row level security;

create policy "Students view own submissions" on submissions
  for select using (user_id = auth.uid());

create policy "Students create own submissions" on submissions
  for insert with check (user_id = auth.uid());

create policy "Students update own draft submissions" on submissions
  for update using (user_id = auth.uid() and status = 'draft')
  with check (user_id = auth.uid());

create policy "Teachers view submissions of their courses" on submissions
  for select using (
    exists(
      select 1 from assignments a
      join modules m on m.id = a.module_id
      where a.id = submissions.assignment_id and is_course_teacher(m.course_id)
    )
  );

create policy "Admins view all submissions" on submissions
  for select using (current_user_role() = 'admin');
```

**gradings:**

```sql
alter table gradings enable row level security;

create policy "Students view gradings of own submissions" on gradings
  for select using (
    exists(
      select 1 from submissions s
      where s.id = gradings.submission_id and s.user_id = auth.uid()
    )
  );

create policy "Teachers create gradings for their courses" on gradings
  for insert with check (
    graded_by = auth.uid()
    and exists(
      select 1 from submissions s
      join assignments a on a.id = s.assignment_id
      join modules m on m.id = a.module_id
      where s.id = gradings.submission_id and is_course_teacher(m.course_id)
    )
  );

create policy "Teachers update own gradings" on gradings
  for update using (graded_by = auth.uid())
  with check (graded_by = auth.uid());
```

**certificates:**

```sql
alter table certificates enable row level security;

create policy "Students view own certificates" on certificates
  for select using (user_id = auth.uid());

create policy "Admins manage certificates" on certificates
  for all using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- La verificación pública NO usa RLS, va vía service role en route handler
-- que devuelve solo nombre, curso, fecha, estado
```

**audit_logs:**

```sql
alter table audit_logs enable row level security;

create policy "Admins read audit logs" on audit_logs
  for select using (current_user_role() = 'admin');

-- Inserts solo desde service role
```

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

`supabase/seed.sql` crea el estado inicial reproducible:

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

El seed se ejecuta con `supabase db reset` y siempre produce el mismo resultado, lo cual permite reproducir bugs y demos.

## Migraciones

Convención de nombres: `NNNN_descripción_corta.sql` con N de 4 dígitos (0001, 0002, etc.).

Plan de migraciones del MVP:

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
├── 0014_storage_buckets.sql
├── 0015_rls_profiles.sql
├── 0016_rls_courses.sql
├── 0017_rls_lessons.sql
├── 0018_rls_submissions_gradings.sql
├── 0019_rls_certificates_audit.sql
└── 0020_triggers.sql
```

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

Tras cada cambio de migración, regenerar tipos:

```bash
supabase gen types typescript --local > src/types/database.generated.ts
```

Estos tipos NO se editan a mano y se incluyen en git.
