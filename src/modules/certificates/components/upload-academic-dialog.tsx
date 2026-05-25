"use client";

// UploadAcademicDialog: Client Component que abre un Dialog con
// form para seleccionar curso enrolled, archivo PDF y notas
// opcionales. FormData manual + uploadAcademicCertificateAction.
//
// availableCourses son los cursos enrolled (activos) del student
// que aun no tienen cert academico subido; si el array esta vacio,
// el trigger se deshabilita.

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
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
import { uploadAcademicCertificateAction } from "@/modules/certificates/server";

const MAX_BYTES = 20 * 1024 * 1024;

export interface AvailableCourseOption {
  id: string;
  title: string;
}

interface UploadAcademicDialogProps {
  userId: string;
  availableCourses: AvailableCourseOption[];
}

export function UploadAcademicDialog({
  userId,
  availableCourses,
}: UploadAcademicDialogProps) {
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!courseId) {
      toast.error("Selecciona un curso.");
      return;
    }
    if (!file) {
      toast.error("Selecciona un archivo PDF.");
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error("Solo se permiten archivos PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("El archivo supera los 20 MB.");
      return;
    }

    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("courseId", courseId);
    formData.set("file", file);
    if (notes.trim().length > 0) formData.set("notes", notes.trim());

    startTransition(async () => {
      const result = await uploadAcademicCertificateAction(formData);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Certificado académico subido.");
      setOpen(false);
      setCourseId("");
      setNotes("");
      setFile(null);
    });
  }

  const noCoursesAvailable = availableCourses.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={noCoursesAvailable}>
          <Upload className="mr-2 h-4 w-4" />
          Subir certificado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subir certificación académica</DialogTitle>
          <DialogDescription>
            Sube el PDF emitido por la universidad mexicana. Solo se
            acepta un certificado académico por curso. Si necesitas
            reemplazar uno existente, elimínalo primero.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="academic-course">Curso</Label>
            <Select
              value={courseId}
              onValueChange={setCourseId}
              disabled={isPending}
            >
              <SelectTrigger id="academic-course">
                <SelectValue placeholder="Selecciona un curso" />
              </SelectTrigger>
              <SelectContent>
                {availableCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="academic-file">Archivo PDF</Label>
            <Input
              id="academic-file"
              type="file"
              accept="application/pdf,.pdf"
              disabled={isPending}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium file:text-foreground hover:file:bg-emerald-50 hover:file:text-emerald-700"
            />
            <p className="text-xs text-muted-foreground">
              Solo PDF. Máximo 20 MB.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="academic-notes">Notas internas (opcional)</Label>
            <Textarea
              id="academic-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={isPending}
              placeholder="Ej: emitido por Universidad X, octubre 2026."
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !courseId || !file}>
              {isPending ? "Subiendo..." : "Subir certificado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
