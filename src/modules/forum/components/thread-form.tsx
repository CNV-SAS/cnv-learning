"use client";

// ThreadForm: form de create o edit de thread. Discriminated union
// por `mode`. En create redirige al thread recien creado con
// router.push; en edit refresca la pagina y notifica al padre via
// onSuccess para que cierre el modo edit inline.
//
// Pre-fill en edit: initialTitle/initialBody llegan via props.
// useState inicializa con esos valores al mount; si el usuario
// cancela, el padre desmonta este componente (setEditing(false))
// y el estado local se pierde. Al reabrir el form, vuelve a montar
// con los props actuales (origen: thread DB). No hay setState para
// re-sincronizar props con state durante el ciclo, justamente para
// no perder lo que el user esta escribiendo si por algun motivo
// los props cambian en medio (ej. tras autosave futuro).

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createThreadAction,
  editThreadAction,
} from "@/modules/forum/server";

// Hint de markdown removido tras smoke del Bloque 9: para MVP con
// 10 alumnos un textarea sin pista es suficiente. Si en v2 entra
// editor WYSIWYG, tampoco aplica.

interface ThreadFormCreateProps {
  mode: "create";
  courseId: string;
  forumId: string;
  initialTitle?: never;
  initialBody?: never;
  threadId?: never;
  onCancel?: () => void;
  onSuccess?: () => void;
}

interface ThreadFormEditProps {
  mode: "edit";
  courseId: string;
  forumId: string;
  threadId: string;
  initialTitle: string;
  initialBody: string;
  onCancel: () => void;
  onSuccess: () => void;
}

type ThreadFormProps = ThreadFormCreateProps | ThreadFormEditProps;

export function ThreadForm(props: ThreadFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(props.initialTitle ?? "");
  const [body, setBody] = useState(props.initialBody ?? "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (trimmedTitle.length < 3) {
      toast.error("El título debe tener al menos 3 caracteres.");
      return;
    }
    if (trimmedBody.length < 10) {
      toast.error("El cuerpo debe tener al menos 10 caracteres.");
      return;
    }

    setLoading(true);
    try {
      if (props.mode === "create") {
        const result = await createThreadAction({
          courseId: props.courseId,
          forumId: props.forumId,
          title: trimmedTitle,
          body: trimmedBody,
        });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        toast.success("Post publicado");
        router.push(
          `/learn/${props.courseId}/forum/${props.forumId}/thread/${result.value.threadId}`,
        );
      } else {
        const result = await editThreadAction({
          courseId: props.courseId,
          forumId: props.forumId,
          threadId: props.threadId,
          title: trimmedTitle,
          body: trimmedBody,
        });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        toast.success("Post actualizado");
        props.onSuccess();
        router.refresh();
      }
    } catch {
      toast.error("Error inesperado. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="thread-title">Título</Label>
        <Input
          id="thread-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          maxLength={200}
          disabled={loading}
          placeholder="Sé claro y específico"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="thread-body">Cuerpo</Label>
        <Textarea
          id="thread-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          required
          minLength={10}
          maxLength={10000}
          disabled={loading}
          placeholder="Escribe tu post aquí."
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading
            ? "Publicando..."
            : props.mode === "create"
              ? "Publicar post"
              : "Guardar cambios"}
        </Button>
        {props.onCancel && (
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={props.onCancel}
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
