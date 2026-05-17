"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

// Mensajes user-friendly para los error codes que LoginPage puede recibir
// como query param ?error= cuando otros flows redirigen aqui con fallo.
const ERROR_MESSAGES: Record<string, string> = {
  auth_confirm_failed:
    "El link de recuperación no es válido o ya expiró. Solicita uno nuevo.",
  session_expired:
    "Tu sesión de recuperación expiró. Solicita un nuevo link.",
};
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "./PasswordInput";
import { loginSchema, type LoginInput } from "@/modules/auth/validations";
import { loginAction } from "@/modules/auth/server";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Mostrar mensaje de error desde query param solo una vez por mount
  // (evita re-trigger en hot-reload o re-render con misma URL).
  const error = searchParams.get("error");
  const errorShownRef = useRef(false);
  useEffect(() => {
    if (!error || errorShownRef.current) return;
    errorShownRef.current = true;
    toast.error(
      ERROR_MESSAGES[error] ??
        "Ocurrió un error de autenticación. Intenta de nuevo.",
    );
  }, [error]);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      next: searchParams.get("next") ?? undefined,
    },
  });

  async function onSubmit(values: LoginInput) {
    setLoading(true);
    const result = await loginAction(values);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }

    router.push(result.value.redirectTo);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Iniciando sesión..." : "Iniciar sesión"}
        </Button>
      </form>
    </Form>
  );
}
