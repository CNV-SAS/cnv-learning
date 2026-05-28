"use client";

// Dialog compartido para crear y editar una tarea (Bloque 19.4).
// Form discriminado por type:
//   - file_upload: solo metadatos generales (sin extra fields).
//   - essay: idem.
//   - quiz_multiple_choice: el form crea la cabecera; el editor de
//     preguntas/opciones se difiere a v1.2 (warning visible en UI).
//
// due_at: campo datetime-local opcional. El client convierte a ISO
// (UTC) via new Date(value).toISOString() antes de enviar. Vacio =
// sin plazo.

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
  createAssignmentAction,
  updateAssignmentAction,
} from "@/modules/courses/server";
import type {
  Assignment,
  AssignmentType,
} from "@/modules/assignments/types";

type Props =
  | { mode: "create"; moduleId: string; assignment?: undefined }
  | { mode: "edit"; moduleId: string; assignment: Assignment };

// Helpers de conversion entre ISO de BD y datetime-local de HTML.
// datetime-local espera "YYYY-MM-DDTHH:mm" en hora LOCAL. Construimos
// con Date y extraemos los componentes locales para mantener la
// experiencia del docente alineada con su huso (visualizacion comoda).
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  if (value.trim() === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function AssignmentFormDialog(props: Props) {
  const isEdit = props.mode === "edit";
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(
    isEdit ? props.assignment.title : "",
  );
  const [description, setDescription] = useState(
    isEdit ? (props.assignment.description ?? "") : "",
  );
  const [type, setType] = useState<AssignmentType>(
    isEdit ? props.assignment.type : "essay",
  );
  const [dueAt, setDueAt] = useState(
    isEdit ? isoToLocalInput(props.assignment.due_at) : "",
  );
  const [maxScore, setMaxScore] = useState<string>(
    isEdit ? String(Number(props.assignment.max_score)) : "100",
  );
  const [isRequired, setIsRequired] = useState(
    isEdit ? props.assignment.is_required : true,
  );
  const [maxAttempts, setMaxAttempts] = useState<string>(
    isEdit ? String(props.assignment.max_attempts ?? 0) : "0",
  );
  const [isPending, startTransition] = useTransition();

  function reset() {
    if (!isEdit) {
      setTitle("");
      setDescription("");
      setType("essay");
      setDueAt("");
      setMaxScore("100");
      setIsRequired(true);
      setMaxAttempts("0");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const maxScoreNum = Number(maxScore);
    if (Number.isNaN(maxScoreNum)) {
      toast.error("El puntaje máximo debe ser un número.");
      return;
    }

    const maxAttemptsNum = Number(maxAttempts);
    if (
      Number.isNaN(maxAttemptsNum) ||
      !Number.isInteger(maxAttemptsNum) ||
      maxAttemptsNum < 0
    ) {
      toast.error("Los intentos máximos deben ser un entero >= 0.");
      return;
    }

    const dueAtIso = localInputToIso(dueAt);

    const payload = {
      title: title.trim(),
      description: description.trim() === "" ? null : description,
      type,
      dueAt: dueAtIso,
      maxScore: maxScoreNum,
      isRequired,
      maxAttempts: maxAttemptsNum,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateAssignmentAction({
            assignmentId: props.assignment.id,
            ...payload,
          })
        : await createAssignmentAction({
            moduleId: props.moduleId,
            ...payload,
          });

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success(isEdit ? "Tarea actualizada." : "Tarea creada.");
      setOpen(false);
      reset();
    });
  }

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
            Nueva tarea
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar tarea" : "Nueva tarea"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos de la tarea. Los cambios se reflejan inmediatamente para los alumnos."
              : "Crea una tarea evaluable dentro del módulo."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assignment-title">Título</Label>
            <Input
              id="assignment-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={200}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignment-description">
              Descripción (opcional)
            </Label>
            <Textarea
              id="assignment-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={5000}
              disabled={isPending}
              placeholder="Instrucciones, criterios de evaluación, etc."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="assignment-type">Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as AssignmentType)}
                disabled={isPending}
              >
                <SelectTrigger id="assignment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="essay">Ensayo (texto)</SelectItem>
                  <SelectItem value="file_upload">
                    Archivo (upload)
                  </SelectItem>
                  <SelectItem value="quiz_multiple_choice">
                    Quiz (opción múltiple)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignment-max-score">
                Puntaje máximo (1 a 100)
              </Label>
              <Input
                id="assignment-max-score"
                type="number"
                min={1}
                max={100}
                step={1}
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignment-due-at">
              Fecha límite (opcional)
            </Label>
            <Input
              id="assignment-due-at"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Si vacío, la tarea no tiene plazo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="assignment-is-required"
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              disabled={isPending}
              className="h-4 w-4"
            />
            <Label
              htmlFor="assignment-is-required"
              className="cursor-pointer"
            >
              Obligatoria (pesa en el progreso del curso)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignment-max-attempts">Intentos máximos</Label>
            <Input
              id="assignment-max-attempts"
              type="number"
              min={0}
              step={1}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(e.target.value)}
              required
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              0 = intentos ilimitados. N &gt; 0 = el alumno puede entregar
              hasta N veces; si la última nota no aprueba el umbral del
              curso, la tarea queda reprobada y bloquea el progreso.
            </p>
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
                  : "Crear tarea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
