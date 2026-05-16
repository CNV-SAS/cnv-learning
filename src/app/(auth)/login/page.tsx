import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/modules/auth/components";

export default function LoginPage() {
  return (
    <>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">CNV Learning</h1>
        <p className="text-sm text-muted-foreground">
          Inicia sesión para continuar
        </p>
      </div>

      {/* Suspense requerido por useSearchParams en LoginForm (Next.js 15+). */}
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground text-center">
            Cargando...
          </div>
        }
      >
        <LoginForm />
      </Suspense>

      <div className="text-center text-sm">
        <Link
          href="/forgot-password"
          className="text-muted-foreground hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
    </>
  );
}
