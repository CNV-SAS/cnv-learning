-- Migration: 0031_academic_and_corporate_certificates
-- Why: Bloque 22.2 introduce dos nuevas entidades de certificado
-- ademas de la Constancia de Finalizacion existente (tabla
-- certificates, sin cambio):
--
-- 1) academic_certificates: PDF emitido por la universidad mexicana
--    afiliada al diplomado. El admin lo sube manualmente al sistema
--    (viene de afuera). No tiene hash, ni verificacion publica, ni
--    PDF generado. Solo metadata + storage_path.
--
-- 2) corporate_certificates: "Profesional Conectado CNV", emitido
--    manualmente por admin a un student que firma comodato con CNV.
--    Sin course_id (no se asocia a un curso especifico). Con hash
--    SHA-256, verificacion publica via /verify-corporate/[id], y
--    PDF generado por el sistema (template + 4 superposiciones).
--
-- Reusa el enum certificate_status existente ('valid' | 'revoked')
-- para corporate_certificates.status. Academic no tiene status: no
-- se revoca, se borra y se vuelve a subir si hay error.
--
-- Storage bucket academic-certificates: privado, solo PDFs, max 20
-- MB. Path convention: {userId}/{uuid}.pdf (mismo patron que
-- avatars + submissions).

-- ============================================================
-- academic_certificates
-- ============================================================
create table public.academic_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  storage_path text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index academic_certificates_user_idx on public.academic_certificates(user_id);
create index academic_certificates_course_idx on public.academic_certificates(course_id);

alter table public.academic_certificates enable row level security;

-- Student lee solo el suyo (vía user_id = auth.uid()).
create policy "Users view own academic certificate" on public.academic_certificates
  for select using (user_id = auth.uid());

-- Admin lee/gestiona todos.
create policy "Admins manage academic certificates" on public.academic_certificates
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ============================================================
-- corporate_certificates
-- ============================================================
create table public.corporate_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  hash text not null,
  issued_at timestamptz not null default now(),
  issued_by uuid references public.profiles(id) on delete set null,
  status public.certificate_status not null default 'valid',
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  revoked_reason text,
  template_version text not null default 'v1',
  created_at timestamptz not null default now()
);

create index corporate_certificates_user_idx on public.corporate_certificates(user_id);
create index corporate_certificates_status_idx on public.corporate_certificates(status);

comment on column public.corporate_certificates.hash is 'SHA-256(user_id || issued_at || template_version)';
comment on column public.corporate_certificates.template_version is 'Template historico para regenerar el PDF identico al original.';

alter table public.corporate_certificates enable row level security;

-- Student lee solo el suyo.
create policy "Users view own corporate certificate" on public.corporate_certificates
  for select using (user_id = auth.uid());

-- Admin lee/gestiona todos.
create policy "Admins manage corporate certificates" on public.corporate_certificates
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ============================================================
-- Storage bucket academic-certificates + RLS
-- ============================================================
insert into storage.buckets (id, name, public) values ('academic-certificates', 'academic-certificates', false);

-- Student lee SU propio PDF: path comienza con su userId.
create policy "Users read own academic certificate file" on storage.objects
  for select using (
    bucket_id = 'academic-certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin lee cualquier PDF.
create policy "Admins read academic certificate files" on storage.objects
  for select using (
    bucket_id = 'academic-certificates'
    and public.current_user_role() = 'admin'
  );

-- Admin sube/borra cualquier PDF.
create policy "Admins upload academic certificate files" on storage.objects
  for insert with check (
    bucket_id = 'academic-certificates'
    and public.current_user_role() = 'admin'
  );

create policy "Admins delete academic certificate files" on storage.objects
  for delete using (
    bucket_id = 'academic-certificates'
    and public.current_user_role() = 'admin'
  );
