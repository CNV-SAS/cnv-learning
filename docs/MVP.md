# CNV Learning, MVP

**Última actualización:** 12 de mayo de 2026
**Estado:** alcance cerrado, listo para ejecución
**Responsable técnico:** Santiago Uribe
**Responsable académico:** Director Científico de CNV

## 1. Contexto y visión

CNV Learning es la plataforma de aprendizaje propia de Connected Nutrition Ventures SAS. Aunque el primer cohorte es un Diplomado en Medicina Bioeléctrica para 10 alumnos, el sistema se construye como una **Learning Core Platform (LCP)** capaz de soportar a futuro: acreditación profesional, onboarding clínico, sistema de compliance, certificación científica, formación de terceros, protocolos ANI-BIS-E educativos, y eventualmente CPD/CME.

La arquitectura del MVP refleja esa ambición desde el día uno (bounded contexts, extensibilidad, separación de dominios), pero la **superficie funcional** del MVP es deliberadamente acotada: el aula que se abre la primera semana.

## 2. Usuarios y entorno del lanzamiento

- **Cohorte inicial:** 10 alumnos invitados, cerrado, sin registro público.
- **Roles:** 1 administrador (Santiago, `sau.idk001@gmail.com`), 3 docentes, 10 estudiantes.
- **Curso disponible:** Diplomado de Medicina Bioeléctrica y Sistema ANI BIS-E (10 módulos).
- **Pagos:** gestionados por fuera del LMS. El admin inscribe manualmente a quien pagó.
- **Dominio:** `lms.cnvsystem.com`.
- **Idioma:** español neutro.

## 3. Stack técnico

- **Framework:** Next.js 15 con App Router.
- **Lenguaje:** TypeScript estricto (`strict: true`).
- **UI:** Tailwind CSS + shadcn/ui como primitivos.
- **Tipografía:** Montserrat (titulares) + Inter (body).
- **Base de datos y auth:** Supabase (PostgreSQL + Auth + Storage + RLS).
- **Hosting:** Vercel (region: por defecto, Node.js runtime).
- **DNS y CDN:** Cloudflare (proxy del subdominio `lms.cnvsystem.com`).
- **Emails:** Resend.
- **IA (SpeedGrader):** Gemini Flash inicialmente, abstracción en `lib/ai/` permite cambiar a Groq.
- **Observabilidad:** Sentry.
- **Validación:** Zod.
- **Generación de PDF:** `@react-pdf/renderer`.
- **Iconografía:** lucide-react.
- **Testing mínimo:** Vitest para policies, progress y certificate generation.

## 4. Funcionalidades del MVP, por bloque

Los bloques siguen un orden de dependencias. No hay un calendario día por día: se avanza secuencialmente y cada bloque tiene criterios de aceptación verificables.

### Bloque 0, Setup técnico

- Repositorio GitHub creado.
- Proyecto Next.js 15 inicializado con TypeScript estricto.
- shadcn/ui instalado y configurado.
- Conexión con Supabase establecida.
- Deploy inicial a Vercel funcionando.
- Sentry instalado y reportando errores de prueba.
- DNS `lms.cnvsystem.com` apuntando a Vercel.
- Variables de entorno cargadas.

**Criterio de aceptación:** la URL `https://lms.cnvsystem.com` responde con la página inicial de Next.js, Sentry captura un error provocado a propósito, y el cliente de Supabase puede consultar una tabla de prueba.

### Bloque 1, Modelo de datos y RLS

Ver `DATABASE.md` para el detalle completo.

- Migraciones SQL versionadas en `supabase/migrations/`.
- Todas las tablas creadas con sus relaciones, índices y comentarios.
- RLS habilitado en todas las tablas con políticas explícitas.
- Trigger automático que crea un row en `profiles` cuando se crea un user en `auth.users`.
- Seed determinístico con 1 admin, 1 docente, 1 estudiante de prueba, 1 curso, 10 módulos, lecciones y tareas placeholder, foros vacíos creados.

**Criterio de aceptación:** desde el dashboard de Supabase, se puede ver el seed cargado completamente. Las queries directas a tablas con un user no autenticado fallan por RLS. Con un user autenticado, las queries devuelven solo lo que su rol permite.

### Bloque 2, Autenticación

- Página `/login` con formulario email + password.
- Página `/forgot-password` envía email vía Resend.
- Página `/reset-password` con link seguro.
- Logout funcional con limpieza de sesión.
- Middleware de Next.js para refresh de sesión.
- Página de error de autorización clara si rol no autorizado intenta entrar a ruta protegida.

**Criterio de aceptación:** los tres roles pueden entrar y salir. La recuperación de contraseña funciona end-to-end. Un usuario sin sesión es redirigido a login. Un estudiante que intente entrar a `/admin` ve mensaje de "no autorizado", no se cuelga ni queda en blanco.

### Bloque 3, Layout y navegación

- Sidebar adaptativo según rol (sin botones hardcodeados, todo viene del rol del usuario).
- Header con avatar y opción logout.
- Página 404 con identidad CNV Learning.
- Error boundary global que reporta a Sentry.
- Loading states reales (no spinners genéricos) en transiciones.

**Criterio de aceptación:** navegando manualmente entre rutas, todo renderiza con la marca correcta. Una URL inexistente muestra 404 con marca. Un error provocado muestra error boundary y queda en Sentry.

### Bloque 4, Curso y navegación de contenido

- Dashboard del estudiante con curso actual e insignia visible.
- Vista del curso con lista de módulos.
- Vista de lección con:
  - Video embebido (YouTube unlisted, vía iframe).
  - PDFs descargables (servidos desde Supabase Storage).
  - Texto enriquecido (markdown renderizado).
  - Botón "marcar como completada".
- Navegación entre lecciones (anterior, siguiente).

**Criterio de aceptación:** el estudiante de prueba puede entrar al diplomado, navegar entre lecciones, ver el video placeholder, descargar un PDF placeholder, y leer el markdown placeholder.

### Bloque 5, Progreso del estudiante

- Marcar lección como completada actualiza la tabla `lesson_progress`.
- Barra de progreso por módulo y por curso, calculada en tiempo real.
- "Continuar donde quedé" en el dashboard.
- Todos los módulos abiertos desde el inicio (no hay desbloqueo progresivo en MVP).
- Insignia automática según porcentaje: Junior Bioimpedancia (0 a 59%), Senior Medicina Bioeléctrica (60 a 99%), Master ATLAS (100%).

**Criterio de aceptación:** marcando lecciones como completadas, la barra avanza, la insignia cambia en los umbrales, y el "continuar" lleva a la última lección no completada.

### Bloque 6, Tareas y entregas

- Vista de tarea para el estudiante con descripción y plazo.
- Subida de archivo a Supabase Storage.
- Vista del docente con bandeja de entregas pendientes.
- Editor de calificación con nota numérica y feedback escrito.
- Libro de notas básico del estudiante (lista de tareas con su nota).

**Criterio de aceptación:** el estudiante entrega un archivo, el docente lo ve en su bandeja, califica, el estudiante ve la nota y feedback. Notificación por email al estudiante al recibir calificación.

### Bloque 7, Quiz de opción múltiple

- Quizzes cargados desde la base de datos (no editables por docente en MVP).
- Reproductor del quiz con opciones radio.
- Calificación automática inmediata.
- Resultado visible al estudiante.

**Criterio de aceptación:** el estudiante de prueba puede tomar un quiz seed, responder, y ver su nota inmediatamente. La nota se guarda en la BD y aparece en el libro de notas.

### Bloque 8, SpeedGrader IA

- En la vista de calificación del docente, botón "Generar sugerencia IA".
- Click llama al route handler `POST /api/grading/suggest`.
- Provider Gemini envía la entrega + prompt versionado.
- Resultado parseado con Zod, guardado en `ai_grading_suggestions`.
- Visible al docente como sugerencia (no calificación final).
- Disclaimer explícito: "sugerencia generada por IA, requiere revisión humana".
- Si el docente publica la calificación final usando la sugerencia, se enlaza el ID.

**Criterio de aceptación:** el docente de prueba entra a calificar una entrega, pide sugerencia IA, en menos de 8 segundos ve la sugerencia con nota y feedback. La sugerencia queda persistida y al volver a entrar se muestra la misma sin regenerar (a menos que pida "regenerar" explícito).

### Bloque 9, Foros simples

- Foro de presentación general (uno por curso).
- Foro de dudas e inquietudes (uno por curso).
- Crear post (título + cuerpo).
- Responder en hilo plano (sin sub-replies).
- Sin notificaciones push, sin menciones, sin adjuntos.

**Criterio de aceptación:** los tres roles pueden crear posts y responder. La lista se actualiza correctamente.

### Bloque 10, Anuncios y notificaciones

- Tabla `notifications` con notificaciones in-app.
- Componente bell en header con contador de no leídas.
- Página `/notifications` con lista.
- Docente puede emitir anuncio al curso desde su panel.
- Admin puede emitir anuncio global desde su panel.
- Email automático vía Resend al recibir calificación.
- Email automático al recibir anuncio del docente o admin.

**Criterio de aceptación:** un anuncio del docente llega a los 10 estudiantes in-app y por email. El bell muestra contador. Al hacer clic en la notificación se marca como leída.

### Bloque 11, Insignias por progreso

- Ya implementadas en Bloque 5 vía evento `progress.updated`.
- Visualización en dashboard y perfil.

**Criterio de aceptación:** al cruzar los umbrales 60% y 100%, la insignia visible cambia automáticamente sin necesidad de refresh.

### Bloque 12, Certificados verificables

- Tabla `certificates` con entidad persistida (no solo PDF).
- Emisión automática vía handler de evento `course.completed`.
- Hash SHA-256 calculado e incluido.
- Route handler `GET /api/certificates/<id>/pdf` genera el PDF on-demand con `@react-pdf/renderer`.
- Template versionado: `certificates/templates/v1/`.
- Página pública `/verify/<id>` muestra nombre, curso, fecha, estado (válido o revocado).
- QR en el PDF apunta a la URL de verificación.

**Criterio de aceptación:** al completar el 100% del curso, el certificado se emite. El estudiante descarga el PDF. Cualquier persona puede verificar en `/verify/<id>` sin login. Admin puede revocar desde su panel y el estado cambia visiblemente.

### Bloque 13, Panel docente

- Vista overview con métricas: total alumnos, en curso, promedio del curso, entregas pendientes de calificar.
- Lista de alumnos con su progreso individual.
- Acceso rápido a calificar entregas.
- Editor del cronograma del curso (fechas importantes).
- Envío de anuncios al curso.

**Criterio de aceptación:** el docente puede ver el estado real del cohorte y operar todas sus funciones desde un solo panel.

### Bloque 14, Panel administrativo

- Vista overview con métricas globales (total usuarios por rol, certificados emitidos, uptime, status BD).
- Gestión de usuarios: crear, editar rol, suspender, resetear contraseña, eliminar.
- Inscripción manual de un usuario a un curso.
- Página de auditoría con eventos críticos (login admin, cambios de rol, eliminaciones).
- Envío de anuncios globales.
- Edición del calendario del curso.

**Criterio de aceptación:** Santiago como admin puede operar todo el ciclo de vida de usuarios y supervisar el sistema.

### Bloque 15, Calendario

- Lista simple de fechas importantes del curso, vista por todos.
- Editable por docente y admin.

**Criterio de aceptación:** las fechas se ven correctamente y se pueden actualizar.

### Bloque 16, Perfil de usuario

- Edición de nombre, foto (Storage), profesión, bio corta.
- Foto sube vía componente con validación de tamaño y tipo.

**Criterio de aceptación:** un estudiante puede editar su perfil y la foto aparece en su avatar.

### Bloque 17, Páginas legales y soporte

- `/privacy` con la Política de Tratamiento de Datos Personales.
- `/terms` con términos de uso básicos.
- `/support` con email visible de contacto.
- Link a `/atlas` que abre ATLAS en pestaña externa.
- Footer presente en todas las páginas con links a estas páginas.

**Criterio de aceptación:** las páginas son accesibles, los links externos abren en nueva pestaña, el footer es consistente.

### Bloque 18, Pulido final

- Revisión completa de loading states.
- Revisión de mensajes de error user-friendly.
- Revisión móvil (responsive, no se rompe en pantallas pequeñas).
- Revisión de accesibilidad básica (focus visible, alt en imágenes, contraste).
- Revisión de copy en español.
- Deploy a producción confirmado.
- Smoke test manual del checklist completo.

**Criterio de aceptación:** un usuario con expectativas razonables puede usar el sistema sin friccion. Sentry no muestra errores recurrentes en las últimas 24 horas.

## 5. Fuera de alcance explícito del MVP

Lo siguiente NO va a estar en la versión 1.0 y se documenta para evitar scope creep:

- Pagos integrados (Wompi, Stripe, Mercado Pago).
- Pasarela de cobros, facturación, recibos.
- Sub-cursos o multi-curso simultáneo.
- Foros con sub-respuestas, menciones, archivos adjuntos.
- Mensajería interna 1 a 1 entre usuarios.
- Cafetería o comunidad general fuera de los foros del curso.
- Editor de contenido para docentes (los docentes en MVP no crean lecciones desde la interfaz, el equipo de CNV las carga vía BD o panel admin).
- SpeedGrader IA automático al recibir entrega (es bajo demanda del docente).
- Tutor IA conversacional dentro del curso.
- Generación automática de quizzes.
- Resumen automático de lecciones.
- Verificación pública avanzada de certificados (blockchain, sello digital firmado criptográficamente).
- App móvil nativa (la web responsive cubre el caso).
- Autenticación de dos factores (2FA).
- SSO con Google, LinkedIn, Microsoft.
- Multi-idioma.
- Integración profunda con ATLAS (en MVP es solo un link externo).
- Multi-tenancy o multi-organización.
- Sistema de pagos para docentes.
- Feature flags.
- A/B testing.
- PostHog u otra analítica de producto.
- Calendario interactivo tipo Google Calendar.
- Sesiones en vivo embebidas (Zoom, Meet).
- Edge runtime de Next.js (todo Node.js en MVP).
- Event bus persistente con cola y reintentos.
- ABAC (autorización por atributos), por ahora solo RBAC contextual.
- Cache distribuido (Redis, Upstash).
- Cobertura de tests E2E con Playwright.

## 6. Roadmap inmediato post-MVP

Una vez el primer cohorte arranque, las siguientes prioridades son:

**v1.1 (semanas 2 a 4 después del lanzamiento):**
- Editor de contenido para docentes desde la interfaz.
- Foros con sub-respuestas y archivos adjuntos.
- Tests E2E críticos con Playwright.
- Mejora del prompt de SpeedGrader con datos reales del cohorte.
- PostHog para analítica de producto.
- Activación de Point-in-Time Recovery en Supabase.

**v2.0 (mes 2 a 4):**
- Integración profunda con ATLAS (SSO compartido, eventos cross-domain).
- Pasarela de pagos integrada.
- Multi-curso simultáneo.
- 2FA opcional.
- Sistema de pagos a docentes.

**v3.0+ (mes 6 en adelante):**
- Expansión a Learning Core Platform completa (acreditación, compliance, onboarding clínico, CPD/CME).
- ABAC para autorización contextual avanzada.
- Tutor IA conversacional.
- App móvil nativa o PWA avanzada.

## 7. Definición de "terminado" para el MVP

El MVP se considera terminado y lanzable cuando se cumplen TODAS las siguientes condiciones:

1. Los 18 bloques tienen su criterio de aceptación verificado.
2. El smoke test manual de 30 puntos (en `docs/SMOKE-TEST.md`, se genera al final) pasa completo.
3. Sentry no tiene errores P1 o P2 en las últimas 48 horas.
4. Los 10 alumnos del primer cohorte están creados, inscritos al curso y notificados con sus credenciales.
5. El director científico revisó la versión en staging y aprobó.
6. La política de privacidad está publicada y firmada por la empresa.
7. La copia de seguridad inicial se ha realizado y probado en restauración.
