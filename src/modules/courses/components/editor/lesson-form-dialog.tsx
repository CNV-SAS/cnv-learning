"use client";

// Dialog compartido para crear y editar una leccion (Bloque 19.3).
// Form discriminado por type:
//   - video: video_url requerido, content_markdown opcional.
//   - pdf: video_url no se muestra, content_markdown opcional.
//   - mixed: video_url opcional, content_markdown opcional.
//
// El content_markdown vive en Tabs (Editar / Preview): textarea
// crudo en Editar, render real con LessonContent en Preview (mismo
// componente que ve el estudiante).

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { LessonContent } from "@/modules/courses/components/lesson-content";
import {
  createLessonAction,
  updateLessonAction,
} from "@/modules/courses/server";
import type { Lesson, LessonType } from "@/modules/courses/types";

type Props =
  | { mode: "create"; moduleId: string; lesson?: undefined }
  | { mode: "edit"; moduleId: string; lesson: Lesson };

export function LessonFormDialog(props: Props) {
  const isEdit = props.mode === "edit";
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(isEdit ? props.lesson.title : "");
  const [type, setType] = useState<LessonType>(
    isEdit ? props.lesson.type : "mixed",
  );
  const [videoUrl, setVideoUrl] = useState(
    isEdit ? (props.lesson.video_url ?? "") : "",
  );
  const [contentMarkdown, setContentMarkdown] = useState(
    isEdit ? (props.lesson.content_markdown ?? "") : "",
  );
  const [duration, setDuration] = useState<string>(
    isEdit && props.lesson.duration_minutes !== null
      ? String(props.lesson.duration_minutes)
      : "",
  );
  const [isPending, startTransition] = useTransition();

  function reset() {
    if (!isEdit) {
      setTitle("");
      setType("mixed");
      setVideoUrl("");
      setContentMarkdown("");
      setDuration("");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const durationParsed = duration.trim() === "" ? null : Number(duration);
    if (durationParsed !== null && Number.isNaN(durationParsed)) {
      toast.error("La duración debe ser un número.");
      return;
    }

    const payload = {
      title: title.trim(),
      type,
      contentMarkdown:
        contentMarkdown.trim() === "" ? null : contentMarkdown,
      videoUrl: videoUrl.trim() === "" ? null : videoUrl.trim(),
      durationMinutes: durationParsed,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateLessonAction({
            lessonId: props.lesson.id,
            ...payload,
          })
        : await createLessonAction({
            moduleId: props.moduleId,
            ...payload,
          });

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success(isEdit ? "Lección actualizada." : "Lección creada.");
      setOpen(false);
      reset();
    });
  }

  const showVideoField = type === "video" || type === "mixed";
  const videoRequired = type === "video";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Editar
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva lección
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar lección" : "Nueva lección"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos de la lección. Los cambios se reflejan inmediatamente para los alumnos."
              : "Se crea al final del módulo. Podrás reordenarla después."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lesson-title">Título</Label>
            <Input
              id="lesson-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={200}
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lesson-type">Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as LessonType)}
                disabled={isPending}
              >
                <SelectTrigger id="lesson-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="mixed">Mixto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-duration">
                Duración (min, opcional)
              </Label>
              <Input
                id="lesson-duration"
                type="number"
                min={1}
                max={999}
                step={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          {showVideoField && (
            <div className="space-y-2">
              <Label htmlFor="lesson-video-url">
                Video URL{" "}
                {videoRequired ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="text-muted-foreground">(opcional)</span>
                )}
              </Label>
              <Input
                id="lesson-video-url"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                required={videoRequired}
                disabled={isPending}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="lesson-content">Contenido (markdown, opcional)</Label>
            <Tabs defaultValue="edit">
              <TabsList>
                <TabsTrigger value="edit">Editar</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="edit">
                <Textarea
                  id="lesson-content"
                  value={contentMarkdown}
                  onChange={(e) => setContentMarkdown(e.target.value)}
                  rows={10}
                  maxLength={20000}
                  disabled={isPending}
                  placeholder="## Encabezado&#10;&#10;Texto con **negrita**, *itálica*, listas, etc."
                  className="font-mono text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Markdown soportado: encabezados, listas, negrita, itálica,
                  enlaces, código, citas. GFM (tablas, task lists) habilitado.
                </p>
              </TabsContent>
              <TabsContent value="preview">
                <div className="min-h-[240px] rounded-md border border-border bg-card p-4">
                  {contentMarkdown.trim() === "" ? (
                    <p className="text-sm text-muted-foreground">
                      Vacío. Escribe contenido en la pestaña Editar para ver
                      el preview aquí.
                    </p>
                  ) : (
                    <LessonContent content={contentMarkdown} />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Guardando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Crear lección"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
