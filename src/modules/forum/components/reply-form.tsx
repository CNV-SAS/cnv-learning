"use client";

// ReplyForm: textarea + boton "Publicar respuesta". Tras success,
// resetea el body, refresca el page (para que el nuevo reply
// aparezca arriba del form) y hace scrollIntoView del form para
// mantener el contexto del user (router.refresh no scrollea, pero
// la lista crece y empuja el form hacia abajo).
//
// El timeout pequeno (180ms) le da margen al server-side refetch
// para landing antes del scroll. Si no termino aun, scroll igual
// es valido (la posicion del form en el DOM no cambia: ya estaba
// mounted, solo el list arriba crecio).

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createReplyAction } from "@/modules/forum/server";

interface ReplyFormProps {
  courseId: string;
  forumId: string;
  threadId: string;
}

export function ReplyForm({ courseId, forumId, threadId }: ReplyFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    const trimmed = body.trim();
    if (trimmed.length === 0) {
      toast.error("La respuesta no puede estar vacía.");
      return;
    }

    setLoading(true);
    try {
      const result = await createReplyAction({
        courseId,
        forumId,
        threadId,
        body: trimmed,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Respuesta publicada");
      setBody("");
      router.refresh();
      setTimeout(() => {
        formRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 180);
    } catch {
      toast.error("Error inesperado. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-2">
      <Label htmlFor="reply-body">Tu respuesta</Label>
      <Textarea
        id="reply-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        required
        maxLength={10000}
        disabled={loading}
        placeholder="Escribe tu respuesta aquí."
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading || body.trim().length === 0}
        >
          {loading ? "Publicando..." : "Publicar respuesta"}
        </Button>
      </div>
    </form>
  );
}
