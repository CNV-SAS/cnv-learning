-- Migration: 0002_profiles
-- Why: profiles es la entidad de usuario del dominio CNV. auth.users es solo
-- identidad tecnica (DATABASE.md principio 1). El trigger on_auth_user_created
-- garantiza que crear un user via Supabase Auth materializa inmediatamente su
-- row en profiles, evitando estados inconsistentes donde existe identidad pero
-- no perfil de dominio. La funcion handle_new_user aplica el hardening de
-- security definer (search_path vacio + identificadores calificados con schema)
-- para prevenir search_path hijacking.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  avatar_url text,
  role public.user_role not null default 'student',
  professional_license text,
  institution text,
  specialization text,
  bio text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create index profiles_email_idx on public.profiles(email);

comment on table public.profiles is 'Perfil de usuario CNV. auth.users es solo identidad técnica.';
comment on column public.profiles.role is 'Simplificación MVP. En v2 puede migrar a tabla memberships con roles contextuales.';
comment on column public.profiles.professional_license is 'Campo preparado para compliance futura. Nullable en MVP.';

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
