"use client";

// Dialog para crear un nuevo recurso del curso (Bloque 20.2). Form
// con Tabs "Archivo" | "Enlace" que cambian la fuente del contenido:
//
//   - Archivo: usuario selecciona file local. On submit:
//     1. Cliente valida size + MIME type.
//     2. Cliente sube el blob a Storage bucket course-resources via
//        supabase-js (bypassa el limite de 1 MB de Next.js).
//     3. Cliente llama createCourseResourceAction con storage_path +
//        sizeBytes + mimeType.
//     4. Si la action falla (quota, RLS), cliente borra el blob
//        huerfano de Storage como cleanup.
//
//   - Enlace: usuario pega URL externa (Zoom, Drive, YouTube). No
//     hay upload. La action persiste directo external_url.
//
// scope discriminator: moduleId=null = recurso general del curso;
// moduleId=set = recurso del modulo. La caller decide.

import { useRef, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { FileUp, Link as LinkIcon, Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCourseResourceAction } from "@/modules/courses/server";
import {
  COURSE_RESOURCE_ACCEPT_ATTR,
  COURSE_RESOURCE_ALLOWED_MIME_TYPES,
  COURSE_RESOURCE_FILE_MAX_BYTES,
  buildCourseResourcePath,
  formatBytes,
} from "@/modules/courses/data/course-resource-constants";

interface CreateResourceDialogProps {
  courseId: string;
  moduleId: string | null;
}

export function CreateResourceDialog({
  courseId,
  moduleId,
}: CreateResourceDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"file" | "link">("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setKind("file");
    setTitle("");
    setDescription("");
    setFile(null);
    setExternalUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) {
      setFile(null);
      return;
    }
    if (!COURSE_RESOURCE_ALLOWED_MIME_TYPES.has(picked.type)) {
      toast.error("Tipo de archivo no permitido (PDF, DOCX, PPTX, MP3, M4A).");
      e.target.value = "";
      return;
    }
    if (picked.size > COURSE_RESOURCE_FILE_MAX_BYTES) {
      toast.error("El archivo supera el máximo de 20 MB.");
      e.target.value = "";
      return;
    }
    setFile(picked);
    // Auto-fill title si esta vacio: nombre del archivo sin extension.
    if (title.trim() === "") {
      const base = picked.name.replace(/\.[^.]+$/, "");
      setTitle(base.slice(0, 200));
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (kind === "file" && !file) {
      toast.error("Selecciona un archivo.");
      return;
    }
    if (kind === "link" && externalUrl.trim() === "") {
      toast.error("Ingresa el URL del enlace.");
      return;
    }

    startTransition(async () => {
      let storagePath: string | null = null;
      const supabase = createClient();

      if (kind === "file" && file) {
        storagePath = buildCourseResourcePath(courseId, moduleId, file.type);
        const { error: uploadError } = await supabase.storage
          .from("course-resources")
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });
        if (uploadError) {
          toast.error("No fue posible subir el archivo. Intenta de nuevo.");
          return;
        }
      }

      const result = await createCourseResourceAction({
        courseId,
        moduleId,
        kind,
        title: title.trim(),
        description: description.trim() === "" ? null : description,
        storagePath,
        sizeBytes: kind === "file" && file ? file.size : null,
        mimeType: kind === "file" && file ? file.type : null,
        externalUrl: kind === "link" ? externalUrl.trim() : null,
      });

      if (!result.ok) {
        // Cleanup del blob huerfano si la action fallo despues del
        // upload (quota, RLS, etc.).
        if (storagePath) {
          await supabase.storage
            .from("course-resources")
            .remove([storagePath]);
        }
        toast.error(result.error.message);
        return;
      }

      toast.success("Recurso creado.");
      setOpen(false);
      reset();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo recurso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo recurso</DialogTitle>
          <DialogDescription>
            Sube un archivo descargable o agrega un enlace externo (Zoom,
            Drive, video).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resource-title">Título</Label>
            <Input
              id="resource-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={200}
              disabled={isPending}
              placeholder="Ej. Guía de bioimpedancia"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-description">
              Descripción (opcional)
            </Label>
            <Textarea
              id="resource-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={1000}
              disabled={isPending}
            />
          </div>

          <Tabs
            value={kind}
            onValueChange={(v) => setKind(v as "file" | "link")}
          >
            <TabsList>
              <TabsTrigger value="file" disabled={isPending}>
                <FileUp className="mr-2 h-3.5 w-3.5" />
                Archivo
              </TabsTrigger>
              <TabsTrigger value="link" disabled={isPending}>
                <LinkIcon className="mr-2 h-3.5 w-3.5" />
                Enlace
              </TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="space-y-2 pt-2">
              <Input
                ref={fileInputRef}
                id="resource-file"
                type="file"
                accept={COURSE_RESOURCE_ACCEPT_ATTR}
                onChange={handleFileChange}
                disabled={isPending}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  {file.name} — {formatBytes(file.size)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Tipos permitidos: PDF, DOCX, PPTX, PPT, MP3, M4A. Máximo
                20 MB.
              </p>
            </TabsContent>
            <TabsContent value="link" className="space-y-2 pt-2">
              <Label htmlFor="resource-url">URL externa</Label>
              <Input
                id="resource-url"
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                disabled={isPending}
                placeholder="https://zoom.us/rec/share/..."
                maxLength={2048}
              />
            </TabsContent>
          </Tabs>

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
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Crear recurso"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
