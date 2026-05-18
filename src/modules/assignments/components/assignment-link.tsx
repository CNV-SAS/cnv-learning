// AssignmentLink: link a una tarea desde el ModuleList. Server
// Component. Visual: icono FileText + titulo + badge "Entregada"
// sutil cuando el user ya tiene submission (sin distinguir
// submitted vs graded; el detalle vive en la pagina de la tarea
// o en el libro de notas).

import Link from "next/link";
import { FileText } from "lucide-react";
import type { Assignment } from "../types";

interface AssignmentLinkProps {
  courseId: string;
  assignment: Assignment;
  hasSubmission?: boolean;
}

export function AssignmentLink({
  courseId,
  assignment,
  hasSubmission,
}: AssignmentLinkProps) {
  return (
    <Link
      href={`/learn/${courseId}/assignment/${assignment.id}`}
      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-muted"
    >
      <div className="flex items-center gap-3 text-foreground">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span>{assignment.title}</span>
      </div>
      {hasSubmission && (
        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
          Entregada
        </span>
      )}
    </Link>
  );
}
