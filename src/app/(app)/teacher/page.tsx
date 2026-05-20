// Panel docente. Pendiente del overview real en sub-bloque 13.3
// (UI con metricas + tabla de alumnos + CTAs). Mientras tanto el
// landing redirige a la bandeja de calificaciones (la funcion mas
// usada del docente; conserva continuidad UX durante el refactor).

import { redirect } from "next/navigation";

export default function TeacherPage() {
  redirect("/teacher/inbox");
}
