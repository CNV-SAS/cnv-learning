// Pagina de reset password (paso 2 del flow de recovery).
//
// Guard server-side: REQUIERE sesion temporal activa (creada por
// /auth/confirm via verifyOtp). Si llega sin sesion (link expirado,
// browser cross-window que perdio el code_verifier, scraper, etc.)
// redirige a /login con error claro. Evita renderizar el form y que
// el submit falle despues con "session_missing" (UX inferior).

import { redirect } from "next/navigation";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { ResetPasswordForm } from "@/modules/auth/components";

export default async function ResetPasswordPage() {
  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login?error=session_expired");

  return (
    <>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Cambiar contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Ingresa tu nueva contraseña
        </p>
      </div>

      <ResetPasswordForm />
    </>
  );
}
