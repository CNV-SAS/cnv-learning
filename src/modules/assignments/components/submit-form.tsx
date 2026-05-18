"use client";

// SubmitForm: form de entrega de tarea. Discrimina por
// assignment.type:
//   - file_upload: input file con accept .pdf/.docx/.odt + check
//     client-side de size (warning previo a action server).
//   - essay: Textarea con min 1 char.
//
// Construye FormData manualmente y llama submitAssignmentAction.
// router.refresh() tras OK para que el page server-side re-fetch
// y muestre el estado entregado.
//
// El form se deshabilita si disabled=true (deadline pasada o
// submission ya existe; el page hace el pre-check).

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitAssignmentAction } from "@/modules/assignments/server";
// Import path directo (NO via barrel data) para evitar arrastrar
// submission-storage.ts -> createClient -> next/headers en el
// Client bundle. Ver constants.ts comment header.
import { MAX_FILE_SIZE_BYTES } from "@/modules/assignments/data/constants";

interface SubmitFormProps {
  assignmentId: string;
  type: "file_upload" | "essay";
  disabled?: boolean;
}

export function SubmitForm({
  assignmentId,
  type,
  disabled = false,
}: SubmitFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [essayText, setEssayText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled || loading) return;

    if (type === "file_upload") {
      if (!file) {
        toast.error("Selecciona un archivo.");
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(
          `El archivo excede el tamaño máximo (${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB).`,
        );
        return;
      }
    }
    if (type === "essay" && essayText.trim().length === 0) {
      toast.error("El texto de la entrega no puede estar vacío.");
      return;
    }

    const formData = new FormData();
    formData.set("kind", type);
    formData.set("assignmentId", assignmentId);
    if (type === "file_upload" && file) {
      formData.set("file", file);
    } else if (type === "essay") {
      formData.set("essayText", essayText);
    }

    setLoading(true);
    try {
      const result = await submitAssignmentAction(formData);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Tarea entregada");
      router.refresh();
    } catch {
      toast.error("Error inesperado. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {type === "file_upload" ? (
        <div className="space-y-2">
          <Label htmlFor="submission-file">Archivo</Label>
          <Input
            id="submission-file"
            type="file"
            accept=".pdf,.docx,.odt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text"
            disabled={disabled || loading}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">
            PDF, DOCX o ODT. Máximo 10 MB.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="submission-essay">Tu respuesta</Label>
          <Textarea
            id="submission-essay"
            rows={8}
            value={essayText}
            disabled={disabled || loading}
            onChange={(e) => setEssayText(e.target.value)}
            placeholder="Escribe tu respuesta aquí."
          />
        </div>
      )}
      <Button
        type="submit"
        disabled={disabled || loading}
        className="w-full"
      >
        {loading ? "Enviando..." : "Entregar tarea"}
      </Button>
    </form>
  );
}
