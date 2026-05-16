-- Migration: 0010_forums
-- Why: foros simples por curso (MVP: presentacion + dudas). forums es el
-- contenedor (inmutable, sin updated_at), forum_threads es el post inicial
-- (editable, con is_pinned para destacar), forum_replies es la respuesta
-- en hilo plano (sin sub-replies en MVP, sin updated_at). Tres tablas en
-- una migracion como unidad logica.
--
-- Unique (course_id, slug) en forums permite stable URLs tipo
-- /courses/medicina-bioelectrica/forums/dudas. FKs en cascade limpian el
-- arbol completo si se elimina curso, foro o thread.

create table public.forums (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (course_id, slug)
);

create index forums_course_idx on public.forums(course_id);

create table public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  forum_id uuid not null references public.forums(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index forum_threads_forum_idx on public.forum_threads(forum_id);
create index forum_threads_author_idx on public.forum_threads(author_id);

create table public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index forum_replies_thread_idx on public.forum_replies(thread_id);
