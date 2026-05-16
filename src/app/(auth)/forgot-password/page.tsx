import Link from "next/link";
import { ForgotPasswordForm } from "@/modules/auth/components";

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
        <p className="text-sm text-muted-foreground">
          Ingresa tu email y te enviaremos un link de recuperación
        </p>
      </div>

      <ForgotPasswordForm />

      <div className="text-center text-sm">
        <Link
          href="/login"
          className="text-muted-foreground hover:underline"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    </>
  );
}
