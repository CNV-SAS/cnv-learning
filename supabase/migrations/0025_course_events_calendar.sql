-- Migration: 0025_course_events_calendar
-- Why: Bloque 15 introduce calendario por curso. Tabla nueva
-- course_events almacena fechas importantes (clases, examenes,
-- entregas, hitos) que los teachers del curso y admin gestionan,
-- y que enrolled students consultan en read-only.
--
-- Decisiones del plan B15 confirmadas por Santiago:
--   A. starts_at/ends_at son date (no timestamptz): son fechas
--      calendario sin precision horaria. Evita lios timezone.
--   B. ends_at nullable: single-day = NULL; multi-day = rango.
--   C. Sin event_type enum: lista plana sin diferenciar
--      clases/examenes/entregas. Si Gildardo lo requiere en
--      cohorte real, agregar en v2.
--   F. Audit (calendar_event.created/updated/deleted) via
--      service, no en BD. Mismo patron que resto del MVP.
--   A4. CHECK (ends_at IS NULL OR ends_at >= starts_at) como
--       defense-in-depth si la validation Zod falla.
--
-- created_by SET NULL (no CASCADE) preserva la historia del
-- evento si el teacher creador se elimina. Mismo patron que la
-- migracion 0024 (actor FKs).
--
-- updated_at usa el trigger reutilizable set_updated_at de la
-- migracion 0016. La funcion ya existe globalmente; aqui solo
-- creamos el trigger especifico de la tabla.

create table public.course_events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  starts_at date not null,
  ends_at date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_events_ends_after_starts
    check (ends_at is null or ends_at >= starts_at)
);

create index course_events_course_idx on public.course_events(course_id);
create index course_events_starts_idx on public.course_events(starts_at);

create trigger set_updated_at_course_events
  before update on public.course_events
  for each row execute function public.set_updated_at();

alter table public.course_events enable row level security;

-- SELECT: 3 actores con paths distintos.
--   - Enrolled students del curso (policy via is_enrolled).
--   - Teachers asignados al curso (cubierto por "manage" abajo,
--     que incluye SELECT al ser FOR ALL).
--   - Admin (cubierto por "manage" abajo).
create policy "Enrolled students view course events"
  on public.course_events
  for select using (public.is_enrolled(course_id));

-- MANAGE: teachers del curso + admin. FOR ALL cubre SELECT,
-- INSERT, UPDATE, DELETE. with check valida la misma condicion
-- al INSERT/UPDATE (no permite saltar course_id a otro curso).
create policy "Teachers manage course events of their courses"
  on public.course_events
  for all using (public.is_course_teacher(course_id))
  with check (public.is_course_teacher(course_id));

create policy "Admins manage all course events"
  on public.course_events
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
