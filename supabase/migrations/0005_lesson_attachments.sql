-- Migration: 0005_lesson_attachments
-- Why: lesson_attachments materializa los PDFs y otros archivos descargables
-- de una leccion (MVP: 1 PDF placeholder por leccion). storage_path apunta
-- a un objeto en el bucket lesson-materials (provisionado en migracion 0014).
-- No hay FK al bucket porque storage.objects es schema interno de Supabase
-- y la integridad se valida por RLS, no por FK.
--
-- Sin updated_at por diseno: attachments son inmutables. Si un docente
-- quiere reemplazar el PDF, crea un nuevo attachment y borra el anterior.
-- size_bytes se guarda como int (suficiente para 2GB, limite operativo
-- del proyecto es 10MB por archivo segun SECURITY.md).

create table public.lesson_attachments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  storage_path text not null,
  display_name text not null,
  mime_type text not null,
  size_bytes int not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index lesson_attachments_lesson_idx on public.lesson_attachments(lesson_id);
