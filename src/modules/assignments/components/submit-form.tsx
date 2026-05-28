"use client";

// SubmitForm: form de entrega de tarea. Discrimina por
// assignment.type:
//   - file_upload: input file con accept .pdf/.docx/.odt + check
//     client-side de size (warning previo a action server).
//   - essay: Textarea con min 1 char.
//
// Bloque post-23 ISSUE 3 sub-7: ahora acepta mode (first|retry) +
// attemptsRemaining + currentAttemptNumber para renderizar el copy
// adecuado segun el contexto (primer intento vs reintento). El page
// padre calcula esto desde computeAssignmentStatus y canResubmit.

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
  // "first": primer intento. "retry": reenvio tras failed_can_retry.
  mode?: "first" | "retry";
  // null = ilimitados. Numero = cuantos quedan despues de este envio
  // (no incluye el actual). Usado para mostrar "Te quedan X intentos".
  attemptsRemaining?: number | null;
  // Numero del intento que el alumno esta a punto de enviar
  // (submittedAttempts + 1). Usado para mostrar "Intento N".
  currentAttemptNumber?: number;
}

export function SubmitForm({
  assignmentId,
  type,
  disabled = false,
  mode = "first",
  attemptsRemaining = null,
  currentAttemptNumber,
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
          `El archivo es demasiado grande. Máximo ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB permitido.`,
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
      toast.success(mode === "retry" ? "Reenvio registrado" : "Tarea entregada");
      router.refresh();
    } catch {
      toast.error("Error inesperado. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const submitLabel = loading
    ? mode === "retry"
      ? "Reenviando..."
      : "Enviando..."
    : mode === "retry"
      ? "Reenviar tarea"
      : "Entregar tarea";

  const headerLine =
    currentAttemptNumber !== undefined
      ? attemptsRemaining === null
        ? `Intento ${currentAttemptNumber} (intentos ilimitados).`
        : `Intento ${currentAttemptNumber}. Después de este te ${
            attemptsRemaining === 1 ? "quedará" : "quedarán"
          } ${attemptsRemaining} intento${attemptsRemaining === 1 ? "" : "s"}.`
      : null;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {headerLine && (
        <p className="text-xs font-medium text-muted-foreground">
          {headerLine}
        </p>
      )}
      {type === "file_upload" ? (
        <div className="space-y-2">
          <Label htmlFor="submission-file">Archivo</Label>
          <Input
            id="submission-file"
            type="file"
            accept=".pdf,.docx,.odt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text"
            disabled={disabled || loading}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium file:text-foreground hover:file:bg-emerald-50 hover:file:text-emerald-700"
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
        {submitLabel}
      </Button>
    </form>
  );
}
