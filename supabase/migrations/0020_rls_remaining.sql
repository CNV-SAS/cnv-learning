-- Migration: 0020_rls_remaining
-- Why: cierre del bloque RLS. 7 tablas con 25 policies. certificates y
-- audit_logs usan policies literales de DATABASE.md (663-675 y 679-686).
-- forums, forum_threads, forum_replies, announcements, notifications
-- son inferencia total (el doc no especifica policies). Decisiones
-- aprobadas por Santiago el 2026-05-16:
--   1. Forums solo seed + admin manage (sin INSERT por user en MVP).
--   2. forum_threads con UPDATE por autor (updated_at implica edit).
--      forum_replies inmutables (sin updated_at).
--   3. announcements globales visibles para todos authenticated.
--   4. notifications sin INSERT por user (solo sistema via service role).
--   5. Sin DELETE en notifications/certificates/audit_logs (excepto admin
--      manage en certificates).

-- ============================================================
-- forums (3 policies inferidas)
-- ============================================================
alter table public.forums enable row level security;

create policy "Enrolled students view forums of their courses" on public.forums
  for select using (public.is_enrolled(course_id));

create policy "Teachers view forums of their courses" on public.forums
  for select using (public.is_course_teacher(course_id));

create policy "Admins manage forums" on public.forums
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ============================================================
-- forum_threads (6 policies inferidas)
-- ============================================================
alter table public.forum_threads enable row level security;

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

-- ============================================================
-- forum_replies (5 policies inferidas)
-- ============================================================
alter table public.forum_replies enable row level security;

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

-- ============================================================
-- announcements (5 policies inferidas)
-- ============================================================
alter table public.announcements enable row level security;

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

-- ============================================================
-- notifications (3 policies inferidas)
-- ============================================================
alter table public.notifications enable row level security;

create policy "Users view own notifications" on public.notifications
  for select using (user_id = auth.uid());

create policy "Users update own notifications" on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins view all notifications" on public.notifications
  for select using (public.current_user_role() = 'admin');

-- Sin INSERT por user: las notificaciones las genera el sistema desde
-- service role (core/audit, handlers de eventos en Bloque 10+). Sin
-- DELETE: se mantienen para historico.

-- ============================================================
-- certificates (DATABASE.md 663-675, literal)
-- ============================================================
alter table public.certificates enable row level security;

create policy "Students view own certificates" on public.certificates
  for select using (user_id = auth.uid());

create policy "Admins manage certificates" on public.certificates
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- La verificacion publica de certificado /verify/<id> NO usa RLS,
-- va via service role en route handler (Bloque 12).

-- ============================================================
-- audit_logs (DATABASE.md 679-686, literal)
-- ============================================================
alter table public.audit_logs enable row level security;

create policy "Admins read audit logs" on public.audit_logs
  for select using (public.current_user_role() = 'admin');

-- Sin policies de INSERT/UPDATE/DELETE: inserts solo desde service
-- role (core/audit/log.ts en Bloque 8+ usa lib/supabase/admin.ts).
-- Inmutabilidad por diseno (SECURITY.md linea 149).
