# CNV Learning - Plan post-MVP

Documento maestro del trabajo posterior al cierre del MVP (Bloque 18). Última actualización: 2026-05-22.

## Estado del MVP

MVP cerrado en Bloque 18. 18/18 bloques completos. 328 tests verdes (320 MVP + 8 nuevos del Sprint 1). Smoke E2E aprobado con tester externo, con 3 bugs bloqueantes detectados (ver Sprint 1, todos cerrados).

## Sprint 1: Fixes bloqueantes pre-lanzamiento

Status: done

Bugs detectados durante el smoke con tester externo que deben corregirse antes del lanzamiento real.

### S1.1: Bug del PasswordInput (ojo no toggle correctamente)

Status: done (commits 59a0b08 + a866e36)

Síntoma: el click en el área del ojo ejecuta la animación del SVG pero NO ejecuta el toggle de visibilidad de la contraseña. Solo funciona si el click cae en el borde inferior del button. Reportado desde el Bloque 18 pre-fix A, no resuelto.

Causa probable: el `pointer-events-none` del fix anterior no se aplicó al elemento correcto del DOM. Hay un wrapper o elemento intermedio que captura clicks antes de llegar al button con el handler.

Acción: diagnóstico profundo del componente PasswordInput. Inspeccionar el DOM completo. Reescribir si es necesario para garantizar que el click handler se ejecuta en TODA el área visible del botón.

Verificación: click en cualquier punto del área del ojo (centro, lados, esquinas) debe togglear la visibilidad.

### S1.2: Validación de nombre solo números

Status: done (commit e1dd186)

Síntoma: el admin puede crear un usuario con nombre "123456" (solo números). No es un nombre humano válido.

Acción: agregar regex al Zod schema de create-user para rechazar nombres que sean solo dígitos. Aceptar letras (con tildes), espacios, apóstrofes, y combinaciones con números (ejemplo válido: "Juan Pablo II", "María José", "D'Angelo").

Regex sugerido: debe contener al menos una letra. Ejemplo: `/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/`.

Aplicar el mismo validation a updateProfile en el módulo profile (si el user edita su propio nombre, mismo criterio).

### S1.3: Solo students pueden completar lecciones

Status: done (commit cf751b8 + migración 0026 aplicada por Santiago via SQL Editor)

Síntoma: admin y teacher pueden marcar lecciones como completadas. Esto causa que aparezcan como "alumnos" en la lista del docente (porque tienen lesson_progress rows). También genera errores inconsistentes (a veces deja, a veces no).

Acción doble:

A. Server action markLessonCompleted:
   - Validar `user.role === 'student'` antes del INSERT.
   - Si role no es student, retornar error específico: "Solo los estudiantes pueden completar lecciones."

B. UI de lesson page:
   - Ocultar el botón "Marcar como completada" si `user.role !== 'student'`.
   - Reemplazar por mensaje pequeño en muted: "Vista de docente: solo los estudiantes registran progreso."

C. Datos pre-existentes:
   - Verificar si hay `lesson_progress` rows de usuarios que NO son student (creados durante el bug).
   - Si existen, agregar SQL de limpieza en el sub-bloque: `DELETE FROM lesson_progress WHERE user_id IN (SELECT id FROM profiles WHERE role != 'student')`.

### S1.4: Auditoría de acciones por rol

Status: done (sin fix adicional requerido, audit limpio)

Resultado: 31 server actions auditadas action-level + 6 áreas críticas auditadas service-level. Todas las actions mutativas usan policies específicas de mutación (canSubmitAssignment, canRevokeCertificate, canEmitCourseAnnouncement, canManageUsers, canCompleteLesson tras S1.3, etc.) en lugar de policies "view". El bug de S1.3 fue una excepción puntual, no patrón sistémico.

Acción preventiva: revisar TODAS las server actions del codebase y verificar que cada una valida correctamente el rol del caller.

Output esperado: lista de todas las actions con su validación de rol actual. Si encuentras vulnerabilidades similares a S1.3 (acción que no valida rol), agregarlas como fixes adicionales en este sub-bloque.

Áreas críticas a revisar:
- submissions/quizAttempts: ¿quién puede crear?
- gradings: ¿solo teacher del curso?
- announcements: ¿course solo teacher del curso, global solo admin?
- certificates: ¿solo sistema (auto) o admin (revoke)?
- forum_threads/replies: ¿cualquier course member?
- enrollments: ¿solo admin?

### S1.5: Push + smoke + cierre Sprint 1

Status: in-progress (SPRINTS.md actualizado; push + smoke pendientes de Santiago)

Push de todos los commits del Sprint 1, smoke en producción de los 4 fixes, actualizar SPRINTS.md con status done del Sprint 1.

---

## Sprint 2: v1.1 - Pre-lanzamiento extendido

Status: pending

Features post-MVP críticas antes del lanzamiento real con los 10 alumnos del cohorte.

### Bloque 19: Editor de contenidos para docentes

Status: done (2026-05-22)

Sub-bloques cerrados:
- 19.1 foundation + landing page (commit b365c74).
- 19.2 CRUD módulos + reorder + audit course_module.deleted (commit 216c965, migración 0027).
- 19.3 CRUD lecciones con textarea + preview en vivo + reorder + audit course_lesson.deleted (commit 8a604b3, migración 0028).
- 19.4 CRUD tareas (assignments) sin reorder + audit course_assignment.deleted (commit 894e1e9, migración 0029).
- 19.5 preview "como alumno" para docente + cierre del Bloque 19 (commit e49b40b).

Fixes post-smoke (commit e6a72bb):
- Bug crítico: toast "Invalid UUID" al crear/editar/reordenar contenido. El Bloque 19 introdujo `z.string().uuid()` (RFC 4122 estricto) en 11 schemas, que rechaza los UUIDs v0 del seed. Reemplazo por `z.string().regex(UUID_FORMAT, ...)`, el patrón ya establecido en el resto del codebase. Comment de `lib/utils/uuid.ts` reforzado para prevenir recurrencia.
- Bug visual: conteos de lecciones y tareas en cards de módulo eran texto plano gris pequeño, demasiado sutiles. Elevados a chips coloreados (emerald para lecciones, amber para tareas) en la misma fila que "Módulo N" y "Peso N".

Ajustes UX post-smoke (siguiente commit):
- Labels del editor de lección sin jerga técnica: tab "Editar" → "Contenido de texto", tab "Preview" → "Vista previa", placeholder y hint del textarea simplificados.
- Labels del Select de tipo de lección orientados al docente: "PDF" → "Solo texto", "Mixto" → "Video y texto". Enum en BD sin cambio.

Deferred a v1.2: editor de preguntas/opciones de quiz_multiple_choice. La cabecera del quiz se crea normalmente en 19.4.

Deferred a Bloque 20 (Recursos): editor de attachments (PDFs adjuntos a lecciones).


UI para que el teacher gestione módulos, lecciones y tareas del curso sin tocar BD directamente.

Funcionalidades:
- CRUD de módulos (crear, editar, eliminar, reordenar).
- CRUD de lecciones (crear, editar contenido rich text, eliminar, reordenar).
- CRUD de tareas (crear, editar, eliminar).
- Vista previa del contenido como lo ve el estudiante.

Decisiones técnicas (revisadas durante planning del Bloque 19, 2026-05-22):
- Rich text editor: **textarea + preview en vivo** (no Tiptap). El stack `react-markdown + remark-gfm` ya está instalado para el render del alumno; cero dependencias nuevas. Tiptap aporta WYSIWYG pero suma ~6 paquetes y ~150KB de bundle; el cohorte médico no presenta fricción documentada con markdown básico. Se reevalúa en v1.2 si docentes reportan fricción real.
- Reordenamiento: flechas ↑↓ por item (no drag-and-drop). 10 módulos por curso máximo + 10 lessons por módulo no justifica `@dnd-kit`.
- Borrado: blocking estricto. Si el módulo/lección/tarea tiene datos asociados (lessons, submissions, gradings, etc.), bloquear delete con mensaje contextual que enumera qué bloquea. Soft delete con `deleted_at` se difiere al Bloque 22.
- Permisos: admin OR (teacher AND isTeacherOfCourse). Policy `canEditCourseContent` siguiendo el modelo de `canEmitCourseAnnouncement`.
- Validación: max_score 1-100 (sistema opera 0-100), weight 0-100 con validación de suma ≤100 del curso (informativo en MVP; el cálculo ponderado real se difiere a v1.2).
- Quiz editor (preguntas + opciones de quiz_multiple_choice) y attachments (PDFs) se difieren: quiz editor a v1.2, attachments al Bloque 20 (Recursos) para no duplicar.
- Audit log de deletes: 3 eventos nuevos (`course_module.deleted`, `course_lesson.deleted`, `course_assignment.deleted`) con snapshot completo del objeto en metadata. Creates y updates NO se auditan.
- Preview "como alumno": misma lesson page del student con flag `previewMode=true` que desactiva side effects (markLessonCompleted, last_visited, etc.).

Sub-bloques (5):
- 19.1: Foundation (policy + service shell + landing page + CTA en panel docente).
- 19.2: CRUD módulos (incluyendo reorder con flechas).
- 19.3: CRUD lecciones con textarea + preview en vivo (incluyendo reorder).
- 19.4: CRUD assignments (sin position; sin quiz editor).
- 19.5: Preview "como alumno" + cierre.

### Bloque 20: Recursos del curso (material descargable + grabaciones)

Status: done (2026-05-22)

Apartado dedicado para material descargable y links a grabaciones de clases.

Sub-bloques cerrados:
- 20.1 foundation: schema + bucket + RLS + policy + service shell (commit ece6ac7, migración 0030).
- 20.2 CRUD + upload flow + quota: validaciones Zod discriminadas (file vs link), upload directo cliente → Storage → server action con quota check (500 MB curso, 20 MB archivo, MIME whitelist), cleanup de blob huérfano si action falla. UI: CreateResourceDialog (Tabs), EditResourceDialog (solo metadata), DeleteResourceDialog (simple), ResourceListItem, StorageUsageBar. Nueva ruta /teacher/courses/[id]/edit/resources + sección Recursos en module detail (commit e026557).
- 20.3 vista student: nueva ruta /learn/[courseId]/resources con signed URLs en paralelo (TTL 15 min), StudentResourceCard read-only, link "Recursos" condicional solo si hay >=1 recurso (commit 03b2368).
- 20.4 cierre: SPRINTS.md actualizado, smoke productivo lo ejecuta Santiago.

Decisiones aplicadas (resumen del planning):
- D1 MIME types: PDF, DOCX, PPTX/PPT, MP3, M4A. Sin MP4 video (link externo). Sin imágenes.
- D2 quota: 500 MB por curso, 20 MB por archivo.
- D3 upload: client-direct a Storage, server persiste metadata. Race condition aceptable, blob huérfano → cleanup B22.
- D5 permisos: canEditCourseResources (admin OR teacher-asignado).
- D6 sin reorder: sort created_at DESC.
- D7 delete: simple confirm sin escribir título.
- D8 lesson attachments editor: DIFERIDO a B22.
- D9 admin storage panel cross-curso: DIFERIDO a B22.
- A1: stat bar de uso "X MB / 500 MB" en /teacher/courses/[id]/edit/resources.
- A4: link "Recursos" en /learn/[courseId] solo si hay >=1 recurso.
- Sin audit log para create/update/delete de recursos (no son evento crítico per regla 8).

Métricas del bloque:
- 1 migración (0030): enum resource_kind + tabla course_resources + bucket course-resources + 4 policies tabla + 5 policies storage.
- ~25 archivos nuevos + ~7 modificados.
- +12 tests Zod en courses-validations.test.ts (suite total: 389/389).

Deferred a Bloque 22:
- Lesson attachments editor (deferral confirmada: el seed pobla los PDFs de lecciones).
- Admin storage panel cross-curso.
- Cleanup batch de blobs huérfanos en Storage (junto con avatars huérfanos).

### Bloque 21: Rediseño visual del dashboard + badges + módulos

Status: done (2026-05-24)

Polish visual basado en prototipos de Gildardo en `design/`.

Sub-bloques cerrados:
- 21.1 foundation visual + fix mobile navbar (commit ef4f693): sidebar redesign (uppercase items, emerald-700 active, RoleLabel "PERFIL X ACTIVO", SidebarLogoutButton al pie), PageHeaderChip rol-aware integrado en layout (dark admin, green teacher), UserDropdown oculto en desktop. 6 shared components creados: HeroCard, StatTile, StatCardLarge, TimelineItem, IconLinkCard, PageHeaderChip. Fix mobile navbar (smoke B20): usePathname + useEffect en MobileNav cierra Sheet on navigate.
- 21.2 student rediseño + énfasis módulos (commit ecfa862): HeroCard verde en dashboard student con "¡Bienvenido, {Nombre}!" + chips Progreso/Lecciones. Nuevo CourseStructureSidebar lg:block como aside derecho en /learn/[courseId] y lesson view (énfasis Gildardo). Lesson page: breadcrumb módulo + sección "Resumen del módulo" con module.description. Calendar usa TimelineItem. Forum como IconLinkCard grid 2x2. AttachmentList pillow style. BadgeDisplay nueva variante "card".
- 21.3 teacher panel cohort stats (commit 6abe012): teacherPanelService.getCohortAverageGrade nuevo + TeacherPanelOverview agrega CohortStats section arriba (2 StatTile chips + 2 StatCardLarge). Labels "Rendimiento global" emerald y "Progreso promedio" blue. Sin "EN CURSO HOY" ni "Engagement".
- 21.4 admin dashboard (commit a65cd68): HeroCard variant=dark "System Administrator" en dashboard admin + grid 4 StatTile (Usuarios, Cursos, Certificados, Entregas pendientes). Pre-fetch en paralelo solo si isAdmin.
- 21.5 cierre: SPRINTS.md actualizado, smoke productivo lo ejecuta Santiago.

Decisiones del planning aplicadas (13 Q):
- Q1 "MIS ESTUDIOS" item: skip.
- Q2 label "Calendario": mantenido.
- Q3 label "Foros": mantenido (no renombrado a Comunidad).
- Q4 ruta /logros: skip (badge restyling in-place).
- Q5 PageHeaderChip: layout-level condicional por rol.
- Q6 "Núcleos de Aprendizaje" = módulo.description en lesson page como "Resumen del módulo".
- Q7 "Entregables y Recursos" = AttachmentList pillow style.
- Q8 stats hero student: "X% progreso" + "N lecciones completadas".
- Q9 "EN CURSO HOY" teacher: quitado.
- Q10 label "Progreso promedio" (no "Engagement").
- Q11 "Rendimiento global" = avg(final_grade) del cohorte.
- Q12 sidebar teacher "FECHAS"/"ANALÍTICA": skip.
- Q13 solo desktop: confirmado, mobile mantiene B18.3.

Ignorados (per reglas + planning):
- "ATLAS V7" item del sidebar (B17 BOUNDARIES.md).
- Botón "Crear Diplomado" en teacher/cursos (admin-only).
- Items "SALUD INFRA" y "REPORTES BI" en sidebar admin (no existen).
- Pantallazo admin/status.png (B22).
- Página /logros separada del student.
- Rediseño del certificado (decisión Santiago: certificado corporativo "Profesional Conectado CNV" va en v1.2 como módulo independiente).

Métricas del bloque:
- 5 sub-bloques.
- 6 shared components nuevos.
- ~20 archivos modificados.
- Suite 389/389 verde, tsc clean.

### Bloque 22: Cleanup TODOs post-MVP + Status panel

Status: pending

TODOs acumulados durante el MVP + nuevo Status panel en admin.

Items:
- Polish avatar upload (preview circular).
- Toast claro al reusar password.
- Chip "Próximo evento" en CourseCard.
- Cleanup avatars huérfanos.
- Editor de prompts IA en admin.
- grade.v2 con rúbricas (contenido a redactar por Gildardo).
- Dialog "Regenerar sugerencia IA" en SpeedGrader.

NUEVO: Status panel en admin
- /admin/status accesible solo para admin.
- Muestra:
  * Conexión BD: ping + latencia + status.
  * Storage Supabase:
    - Total usado vs límite del plan (1 GB en free).
    - Porcentaje consumido con indicador visual (verde <70%, amber 70-90%, rojo >90%).
    - Breakdown por bucket: avatars, course-resources, submissions, certificates.
    - Tamaño de los 10 archivos más grandes (útil para identificar qué ocupa más espacio).
  * Last deploy: SHA del commit + fecha + branch.
  * Sentry: count errores últimos 7 días + link al dashboard.
  * Resend: emails enviados último mes (opcional, si la API lo permite).
- Item nuevo en sidebar admin "Status" (icon Activity o similar).
- force-dynamic para datos en tiempo real.
- Refresh manual con botón "Actualizar" en cada sección.

Sub-bloques estimados: 3-4.

### Bloque 23: Smoke final + Lanzamiento

Status: pending

- Reset de tablas final.
- Crear los 10 usuarios reales del cohorte vía /admin/users.
- Asignar docente principal.
- Smoke E2E manual final (SMOKE_CHECKLIST.md).
- Lanzamiento con comunicación a los 10 alumnos.
