// Root /: redirect permanente a /dashboard.
//
// Bug pre-18 (smoke B17): la ruta raiz no tenia pagina propia del
// MVP (heredada del template create-next-app inicial). El proxy
// envia a /login?next=/ si no hay sesion; tras login el next=/
// volvia al template Next.js en lugar del dashboard.
//
// Fix: redirect server-side a /dashboard. El proxy intercepta
// previamente si no hay sesion (manda a /login). Tras login, el
// next=/ resuelve aqui y termina en /dashboard, que es la entrada
// canonica del LMS para los 3 roles.

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard");
}
