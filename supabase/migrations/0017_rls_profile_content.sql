-- Migration: 0017_rls_profile_content
-- Why: enable RLS + policies para 6 tablas (profiles, courses,
-- course_teachers, modules, lessons, lesson_attachments). profiles y
-- lessons usan las policies literales de DATABASE.md (lineas 530-557 y
-- 580-602). courses, course_teachers, modules, lesson_attachments usan
-- policies inferidas siguiendo el patron del doc (consultado y aprobado
-- por Santiago el 2026-05-16).
--
-- Decision aplicada: courses SELECT restringido a 'authenticated' por
-- precision de Santiago (MVP sin catalogo publico, anon en v2 si hay
-- landing). El resto de tablas no lleva 'to' explicito; las condiciones
-- con auth.uid() / current_user_role() ya filtran anon implicitamente.

-- ============================================================
-- profiles (DATABASE.md 530-557, literal)
-- ============================================================
alter table public.profiles enable row level security;

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

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can update any profile" on public.profiles
  for update using (public.current_user_role() = 'admin');

-- Sin policies de insert/delete: solo service role (handle_new_user
-- cubre el caso normal de creacion).

-- ============================================================
-- courses (4 policies inferidas, restringidas a authenticated)
-- ============================================================
alter table public.courses enable row level security;

create policy "Authenticated users view published courses" on public.courses
  for select to authenticated using (is_published = true);

create policy "Enrolled users view their courses" on public.courses
  for select to authenticated using (public.is_enrolled(id));

create policy "Teachers view their assigned courses" on public.courses
  for select to authenticated using (public.is_course_teacher(id));

create policy "Admins manage courses" on public.courses
  for all to authenticated using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ============================================================
-- course_teachers (4 policies inferidas)
-- ============================================================
alter table public.course_teachers enable row level security;

create policy "Users view own teaching assignments" on public.course_teachers
  for select using (teacher_id = auth.uid());

create policy "Enrolled students see who teaches their course" on public.course_teachers
  for select using (public.is_enrolled(course_id));

create policy "Admins view all teaching assignments" on public.course_teachers
  for select using (public.current_user_role() = 'admin');

create policy "Admins manage course_teachers" on public.course_teachers
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ============================================================
-- modules (3 policies inferidas, patron de lessons)
-- ============================================================
alter table public.modules enable row level security;

create policy "Enrolled students view modules of their courses" on public.modules
  for select using (public.is_enrolled(course_id));

create policy "Teachers view modules of their courses" on public.modules
  for select using (public.is_course_teacher(course_id));

create policy "Admins manage modules" on public.modules
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ============================================================
-- lessons (DATABASE.md 580-602, literal)
-- ============================================================
alter table public.lessons enable row level security;

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

-- ============================================================
-- lesson_attachments (3 policies inferidas)
-- ============================================================
alter table public.lesson_attachments enable row level security;

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
