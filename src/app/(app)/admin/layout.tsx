// Guard del grupo (app)/admin: solo role=admin entra. Si hay sesion pero
// el rol no es admin, redirige a /unauthorized. Si no hay sesion, el
// middleware redirige antes a /login (no llega aqui).

import { redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { canAccessAdmin } from "@/modules/auth/policies";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessAdmin(user)) redirect("/unauthorized");

  return <>{children}</>;
}
