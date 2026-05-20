# Checklist de pruebas funcionales (smoke) — CNV Learning

Este documento es una guía paso a paso para verificar que la plataforma CNV Learning funciona correctamente desde la perspectiva de cada rol. Está diseñado para ser ejecutado por cualquier persona del equipo CNV sin conocimientos técnicos.

**Cuándo usar este checklist:**

- Antes del lanzamiento real con el primer cohorte.
- Después de cualquier deploy a producción.
- Cuando un usuario reporta un problema, para reproducir.

**Cómo ejecutarlo:**

1. Abre `https://lms.cnvsystem.com` en tu navegador (Chrome o Edge recomendados).
2. Sigue cada sección en orden. Marca cada paso completado.
3. Si encuentras un paso que falla, anótalo y repórtalo al equipo técnico con el correo recibido, una captura de pantalla y el nombre del paso.

---

## Sección 1: Como administrador (Santiago u otro admin)

### 1.1 Acceso al panel administrativo

- [ ] Entrar a `https://lms.cnvsystem.com` con tu correo y contraseña de administrador.
- [ ] Verificar que en la barra lateral izquierda aparece la opción "Admin".
- [ ] Click en "Admin": debes ver el panel administrativo con 4 tarjetas de métricas (Usuarios, Certificados, Entregas pendientes, Hilos del foro).
- [ ] Debajo de las métricas debes ver 5 botones de acceso rápido: Usuarios, Docentes, Nuevo anuncio global, Certificados, Auditoría.

### 1.2 Crear un usuario nuevo

- [ ] Click en "Usuarios" desde el panel admin.
- [ ] Click en el botón "Nuevo usuario" en la parte superior derecha.
- [ ] Llenar: correo (ej. `prueba@ejemplo.com`), nombre completo (ej. `Usuario de Prueba`), rol (Estudiante).
- [ ] Click en "Crear usuario": debes ver un mensaje "Usuario creado. Se envió el email de invitación."
- [ ] El usuario nuevo debe aparecer en la lista.
- [ ] Revisar la bandeja de entrada del correo `prueba@ejemplo.com`. Debe llegar un email titulado "Te invitamos a CNV Learning como estudiante".
- [ ] Click en el botón del email "Configurar mi contraseña". Debe llevar a una página de CNV Learning donde se puede definir la contraseña.

### 1.3 Cambiar el rol de un usuario

- [ ] En la lista de Usuarios, click en "Ver detalle" del usuario que creaste.
- [ ] En la sección "Rol", cambiar de "Estudiante" a "Docente" y click "Guardar rol".
- [ ] Verificar mensaje "Rol actualizado".
- [ ] Volver a Usuarios: el badge del usuario debe mostrar ahora "Docente".

### 1.4 Asignar curso a un docente

- [ ] En el detalle del usuario (ahora docente), click "Gestionar inscripciones".
- [ ] Debes ver el título "Cursos asignados a [nombre]".
- [ ] Click "Asignar como docente", elegir un curso, click "Asignar". Verificar mensaje "Docente asignado al curso."

### 1.5 Suspender y reactivar usuario

- [ ] En el detalle del usuario, en la sección "Suspensión", click "Suspender usuario".
- [ ] Ingresar motivo (ej. "Prueba de suspensión") y confirmar.
- [ ] Verificar que el estado del usuario aparece como "Suspendido" (badge rojo).
- [ ] Click "Levantar suspensión": el estado vuelve a "Activo" (badge verde).

### 1.6 Forzar reseteo de contraseña

- [ ] En el detalle del usuario, click "Forzar reseteo de contraseña".
- [ ] Verificar mensaje "Email de reseteo enviado".
- [ ] El usuario debe recibir un email "Reseteo de contraseña en CNV Learning".

### 1.7 Eliminar un usuario (cuidado: destructivo)

- [ ] En la zona destructiva del detalle, click "Eliminar usuario".
- [ ] Tipear el correo del usuario para confirmar.
- [ ] Click "Eliminar definitivamente".
- [ ] Verificar que el usuario desaparece de la lista.

### 1.8 Anuncio global

- [ ] Desde panel admin, click "Nuevo anuncio global".
- [ ] Escribir título y cuerpo, click "Publicar".
- [ ] Todos los usuarios deben recibir el anuncio en su bandeja de notificaciones y por correo.

### 1.9 Revocar un certificado

- [ ] Desde panel admin, click "Certificados".
- [ ] Elegir un certificado válido y click "Revocar".
- [ ] Ingresar motivo y confirmar.
- [ ] El estado debe cambiar a "Revocado" (badge rojo).
- [ ] El estudiante dueño debe recibir un email "Tu certificado de [curso] fue revocado".

### 1.10 Auditoría

- [ ] Desde panel admin, click "Auditoría".
- [ ] Debes ver la lista de eventos paginada (20 por página) con fecha, evento, actor, recurso, metadata.
- [ ] Las horas deben mostrarse en hora local de Colombia (UTC-5).
- [ ] Probar los filtros: elegir un evento del dropdown, filtrar por correo del actor.

---

## Sección 2: Como docente

### 2.1 Acceso al panel docente

- [ ] Entrar con tu correo y contraseña de docente.
- [ ] En la barra lateral debe aparecer la opción "Panel docente".
- [ ] Click en "Panel docente": debes ver el resumen del curso con estadísticas (alumnos, progreso promedio, entregas pendientes), próximos eventos del calendario y lista de estudiantes.

### 2.2 Ver detalle de un estudiante

- [ ] En la tabla de estudiantes, click "Ver detalle" en un alumno.
- [ ] Debes ver su nombre, correo, progreso, badge actual y lista de tareas con estado.

### 2.3 Calificar una entrega

- [ ] Desde panel docente, click "Por calificar (N)" donde N es el número de entregas pendientes.
- [ ] Si hay entregas, debes ver la bandeja con la lista FIFO (más antiguas primero).
- [ ] Click "Calificar" en una entrega.
- [ ] En la página del SpeedGrader: leer la entrega del estudiante (ensayo o archivo descargable).
- [ ] (Opcional) Click "Obtener sugerencia de IA": después de unos segundos debe aparecer una sugerencia de nota y feedback.
- [ ] Click "Aplicar sugerencia" si te parece bien, o escribir nota y feedback manualmente.
- [ ] Click "Publicar calificación". Verificar mensaje "Calificación publicada".
- [ ] El estudiante debe recibir el email "Recibiste tu calificación en [tarea]".

### 2.4 Crear evento en el calendario

- [ ] Desde panel docente, en la sección "Próximos eventos", click "Ver calendario".
- [ ] Click "Nuevo evento": título, descripción (opcional), fecha de inicio, fecha de fin (opcional).
- [ ] Click "Crear evento". Debe aparecer en la lista.
- [ ] Volver al panel docente: el evento debe aparecer en "Próximos eventos".

### 2.5 Emitir anuncio del curso

- [ ] Desde panel docente, click "Nuevo anuncio".
- [ ] Llenar título y cuerpo del anuncio.
- [ ] Click "Publicar al curso": los estudiantes inscritos deben recibirlo en su bandeja de notificaciones y por correo.

### 2.6 Responder en el foro

- [ ] Desde el curso (click "Ir al curso"), abrir un foro existente.
- [ ] Crear un hilo nuevo o responder a uno existente.
- [ ] Verificar que aparece tu respuesta con tu nombre y hora.

---

## Sección 3: Como estudiante

### 3.1 Acceso al dashboard

- [ ] Entrar con tu correo y contraseña de estudiante.
- [ ] El dashboard debe mostrar tu(s) curso(s) inscrito(s) con barra de progreso e insignia (Junior / Senior / Master).

### 3.2 Ver una lección

- [ ] Click en una tarjeta de curso.
- [ ] En la lista de módulos, click en una lección.
- [ ] Verificar que se muestra el contenido (video, PDF, texto) según el tipo de lección.
- [ ] Click "Marcar como completada". La barra de progreso debe avanzar.
- [ ] Al volver al dashboard, el porcentaje debe estar actualizado.

### 3.3 Entregar una tarea

- [ ] En el curso, click en una tarea no entregada.
- [ ] Según el tipo (ensayo, archivo, quiz), llenar el form.
- [ ] Click "Enviar entrega". Verificar mensaje "Entrega enviada."
- [ ] El estado de la tarea debe cambiar a "Entregada, pendiente de calificación".

### 3.4 Ver calificación

- [ ] Una vez el docente califica tu entrega, debes recibir un email "Recibiste tu calificación en [tarea]".
- [ ] En el curso, abrir la tarea: debe mostrar la nota y el feedback del docente.
- [ ] En el "Libro de notas" del curso debe aparecer la nota.

### 3.5 Recibir certificado

- [ ] Cuando completas el 100% del curso, debes recibir un email "Tu certificado de [curso] está listo".
- [ ] En tu perfil, debajo del curso, debe aparecer un botón "Descargar certificado".
- [ ] Al descargarlo, debes ver un PDF con tu nombre, curso, fecha y código QR.
- [ ] Escanear el QR debe abrir la página `/verify/[id]` con la confirmación del certificado.

### 3.6 Calendario del curso

- [ ] En el curso, click "Calendario".
- [ ] Debes ver la lista de eventos (próximos y pasados).
- [ ] Los pasados aparecen con opacidad reducida.
- [ ] No debes ver botones de "Editar" ni "Eliminar" (solo el docente y admin los ven).

### 3.7 Editar tu perfil

- [ ] Click en tu avatar (esquina superior derecha) → "Perfil".
- [ ] Editar nombre, biografía, institución, especialización.
- [ ] Subir una foto: arrastra o haz click en "Subir foto", selecciona una imagen JPG/PNG menor a 2 MB.
- [ ] Verificar que el avatar del header cambia con la foto nueva.
- [ ] Quitar la foto: vuelve a iniciales.

### 3.8 Cambiar contraseña

- [ ] En "Perfil", sección "Seguridad", click "Cambiar contraseña".
- [ ] Ingresar contraseña actual y nueva (8+ caracteres, con letra y dígito).
- [ ] Verificar mensaje "Contraseña actualizada". El usuario debe seguir logueado.
- [ ] Cerrar sesión y volver a entrar con la contraseña nueva.

---

## Sección 4: Flujos críticos cross-rol

### 4.1 Recuperar contraseña olvidada

- [ ] En `/login`, click "¿Olvidaste tu contraseña?".
- [ ] Ingresar correo registrado, click "Enviar enlace".
- [ ] Recibir el email "Restablece tu contraseña en CNV Learning".
- [ ] Click en el botón del email: debe llevar a una página donde se configura la nueva contraseña.
- [ ] Iniciar sesión con la contraseña nueva.

### 4.2 Verificación pública de certificado

- [ ] Abrir `https://lms.cnvsystem.com/verify/<id_certificado>` desde una pestaña incógnita (sin sesión).
- [ ] Debes ver: nombre del estudiante, curso, fecha de emisión, estado (Válido / Revocado).
- [ ] No requiere login.

### 4.3 Notificaciones

- [ ] El icono de campana en el header debe mostrar un contador cuando hay notificaciones nuevas.
- [ ] Click en la campana: debe abrir el panel de notificaciones con la lista.
- [ ] Click en una notificación: debe llevar al recurso relacionado (tarea calificada, anuncio, etc.).

### 4.4 Páginas legales accesibles sin login

- [ ] Sin estar logueado, ir a `/privacy`: debe mostrar la Política de Tratamiento de Datos completa.
- [ ] Ir a `/terms`: debe mostrar los Términos de Uso completos.
- [ ] Ir a `/support`: debe mostrar email de soporte y canal de urgencias.
- [ ] El footer de cualquier página debe tener links a Privacidad, Términos y Soporte.

### 4.5 Responsive móvil

- [ ] Abrir la aplicación en un teléfono o reducir la ventana del navegador a 375px de ancho.
- [ ] La barra lateral debe ocultarse y aparecer un botón de menú (≡) en el header.
- [ ] Click en ≡: la barra lateral debe deslizarse desde la izquierda.
- [ ] Navegar a `/dashboard`, `/profile`, `/learn/[id]`, `/teacher`, `/admin`: ningún contenido debe cortarse horizontalmente.
- [ ] Las tablas (lista de usuarios, auditoría, calificaciones) deben tener scroll horizontal si exceden el ancho.

---

## Sección 5: Verificación final pre-lanzamiento

- [ ] Los 10 alumnos del cohorte tienen cuenta creada y han recibido su email de invitación.
- [ ] El docente principal tiene cuenta y está asignado al curso del Diplomado.
- [ ] Los módulos y lecciones del curso están publicados (visibles para los estudiantes).
- [ ] El calendario del curso tiene los eventos clave (inicio, exámenes, cierre).
- [ ] Los foros del curso están creados con descripciones claras.
- [ ] `audit_logs` se limpió (consultar equipo técnico): los eventos de prueba pre-lanzamiento no contaminan el historial real.
- [ ] Sentry está configurado y captura errores (provocar uno intencional desde `/sentry-example-page` y verificar que llega al dashboard de Sentry).
- [ ] Resend está enviando correos correctamente (verificar que el dominio `cnvsystem.com` está verificado en el panel de Resend).

---

## Si algo falla

1. Anota el paso exacto que falló.
2. Toma captura de pantalla del error.
3. Anota el correo del usuario con el que estabas logueado.
4. Anota la hora aproximada (zona horaria Colombia).
5. Envía todo al equipo técnico (`soporte@cnvsystem.com` o canal interno).

El equipo técnico puede revisar los logs en Sentry, Vercel y Supabase para diagnosticar.
