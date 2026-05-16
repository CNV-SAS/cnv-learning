import { ResetPasswordForm } from "@/modules/auth/components";

export default function ResetPasswordPage() {
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
