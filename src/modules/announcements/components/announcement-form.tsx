"use client";

// AnnouncementForm: form de emision de anuncio. Discriminated union
// por scope: 'course' (requiere courseId, opcionalmente preseleccionado
// si solo hay 1 curso elegible) o 'global'.
//
// Llama emitAnnouncementAction; tras success redirige al dashboard
// (la confirmacion visual viene via la notificacion del recipient
// y el toast).

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { emitAnnouncementAction } from "@/modules/announcements/server";

interface CourseOption {
  id: string;
  title: string;
}

interface CourseFormProps {
  scope: "course";
  courses: CourseOption[];
  // Si /teacher/announce recibe ?courseId=X y X esta en courses,
  // el caller lo pasa aqui para pre-seleccionarlo. Para teacher con
  // 1 solo curso es redundante (igual auto-selecciona); util para
  // admin con N cursos que viene desde el header del curso.
  defaultCourseId?: string;
}

interface GlobalFormProps {
  scope: "global";
  courses?: never;
  defaultCourseId?: never;
}

type AnnouncementFormProps = CourseFormProps | GlobalFormProps;

export function AnnouncementForm(props: AnnouncementFormProps) {
  const router = useRouter();
  const initialCourseId =
    props.scope === "course"
      ? props.defaultCourseId &&
        props.courses.some((c) => c.id === props.defaultCourseId)
        ? props.defaultCourseId
        : props.courses.length === 1
          ? props.courses[0].id
          : ""
      : "";
  const [courseId, setCourseId] = useState<string>(initialCourseId);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
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

    if (props.scope === "course" && !courseId) {
      toast.error("Selecciona un curso.");
      return;
    }

    setLoading(true);
    try {
      const input =
        props.scope === "course"
          ? {
              scope: "course" as const,
              courseId,
              title: trimmedTitle,
              body: trimmedBody,
            }
          : {
              scope: "global" as const,
              title: trimmedTitle,
              body: trimmedBody,
            };
      const result = await emitAnnouncementAction(input);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(
        props.scope === "course"
          ? "Anuncio enviado al curso"
          : "Anuncio global enviado",
      );
      router.push("/dashboard");
    } catch {
      toast.error("Error inesperado. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const submitLabel = loading
    ? "Enviando..."
    : props.scope === "course"
      ? "Publicar al curso"
      : "Publicar global";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {props.scope === "course" && props.courses.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="announcement-course">Curso</Label>
          <Select
            value={courseId}
            onValueChange={setCourseId}
            disabled={loading}
          >
            <SelectTrigger id="announcement-course">
              <SelectValue placeholder="Selecciona un curso" />
            </SelectTrigger>
            <SelectContent>
              {props.courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="announcement-title">Título</Label>
        <Input
          id="announcement-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          maxLength={200}
          disabled={loading}
          placeholder="Sé breve y específico"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="announcement-body">Mensaje</Label>
        <Textarea
          id="announcement-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          required
          minLength={10}
          maxLength={5000}
          disabled={loading}
          placeholder="Escribe el cuerpo del anuncio."
        />
      </div>
      <Button type="submit" disabled={loading}>
        {submitLabel}
      </Button>
    </form>
  );
}
