"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/modules/auth/validations";
import { forgotPasswordAction } from "@/modules/auth/server";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setLoading(true);
    try {
      const result = await forgotPasswordAction(values);
      if (!result.ok) {
        // Solo errores de validacion o rate limit llegan aqui (el service
        // suprime errores de email/Supabase por anti enumeration).
        toast.error(result.error.message);
        return;
      }
      // Mensaje generico que NO confirma si el email existe.
      setSubmitted(true);
    } catch {
      // Catch defensivo. Mensaje generico (no leak detalles tecnicos).
      toast.error("Error inesperado. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          Si el email que ingresaste está registrado en CNV Learning,
          recibirás un link de recuperación en los próximos minutos.
        </p>
        <p>
          Revisa también tu carpeta de spam. Si no llega nada, vuelve a
          intentar más tarde o contáctanos en{" "}
          <a
            href="mailto:soporte@cnvsystem.com"
            className="underline hover:text-foreground"
          >
            soporte@cnvsystem.com
          </a>
          .
        </p>
      </div>
    );
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
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Enviando..." : "Enviar link de recuperación"}
        </Button>
      </form>
    </Form>
  );
}
