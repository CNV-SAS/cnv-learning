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

Status: pending

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

Status: pending

Apartado dedicado para material descargable y links a grabaciones de clases.

Funcionalidades:
- Subir archivos (PDF, DOCX, slides, audios). Max 20 MB por archivo.
- Agregar links externos (Zoom recordings, Drive, etc.).
- Organización: recursos generales del curso + recursos por módulo.
- Lista descargable visible para students enrolled.
- Teacher asignado al curso y admin pueden agregar / editar / eliminar.
- Dashboard de uso de Storage en panel admin (cuánto se ha consumido vs límite).

Decisiones técnicas:
- Upload directo al browser usando supabase-js (NO pasar por server action; el límite de Next.js es 1 MB). El server action solo persiste la URL del archivo subido.
- Storage: Supabase Storage en bucket nuevo `course-resources`.
- Límite por curso: 500 MB.
- Estructura del bucket: `course-resources/{courseId}/general/...` y `course-resources/{courseId}/modules/{moduleId}/...`.
- RLS: student enrolled lee, teacher asignado escribe, admin escribe.

Sub-bloques estimados: 4-5.

### Bloque 21: Rediseño visual del dashboard + badges + módulos

Status: pending

Polish visual basado en prototipos de Gildardo.

Pre-requisito: pantallazos del prototipo en `design/` (carpetas admin, student, teacher).

REGLAS sobre los pantallazos:

1. Los pantallazos son REFERENCIA VISUAL de estilo y de UX.

2. APLICAR fielmente cuando:
   - El pantallazo muestra una feature que YA EXISTE en el código (dashboard, perfil, lista de cursos, contenido de módulos, etc.). Replicar look & feel, layout, componentes, paleta visual.
   - El diseño aporta una mejora clara a la experiencia visual sin requerir features nuevas.

3. IGNORAR (no implementar) cuando:
   - El pantallazo muestra una feature funcional que NO existe en el código actual (ejemplo: si muestra un chat 1-a-1 que el MVP no tiene).
   - Implementar el diseño rompería funcionalidad existente.

4. PRIORIDAD del rediseño:
   - Dashboard del estudiante (landing principal).
   - Contenido de los módulos (Gildardo ha trabajado un diseño especialmente innovador acá, aplicarlo lo más fiel posible).
   - Badges (más identidad visual que la versión actual).
   - CourseCard.
   - Resto: aplicar el lenguaje visual establecido sin pixel-perfect.

5. Funcionalidad y responsive PRIMAN sobre fidelidad pixel-perfect. Si un diseño se rompe en mobile o requiere sacrificar responsive, adaptar el diseño manteniendo el espíritu visual.

Sub-bloques estimados: 4-5.

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
