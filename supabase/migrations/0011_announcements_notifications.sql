-- Migration: 0011_announcements_notifications
-- Why: announcements registra los avisos emitidos por docentes (scope='course')
-- o admin (scope='global'). course_id es nullable porque global no tiene
-- curso asociado. scope como text + check constraint (no enum) por
-- flexibilidad: en v1.1 puede agregarse 'cohort' u otros niveles sin
-- migracion del enum. author_id sin on delete cascade preserva el
-- historial aunque el emisor sea desactivado.
--
-- notifications es el feed in-app que alimenta el bell del header. kind
-- usa el enum notification_kind para los tipos predefinidos. read_at
-- nullable hasta que el usuario marca leido. El indice parcial
-- (user_id, read_at) where read_at is null hace el counter de no leidas
-- O(log n) en vez de scan completo. metadata jsonb para payload flexible
-- por kind (ej. submission_id para graded, certificate_id para issued).

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  course_id uuid references public.courses(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint scope_check check (scope in ('course', 'global'))
);

create index announcements_course_idx on public.announcements(course_id);
create index announcements_scope_idx on public.announcements(scope);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text,
  link text,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications(user_id);
create index notifications_unread_idx on public.notifications(user_id, read_at) where read_at is null;
