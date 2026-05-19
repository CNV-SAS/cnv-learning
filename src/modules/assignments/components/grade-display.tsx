// GradeDisplay: muestra el resultado de la calificacion al
// estudiante. Server Component. Diseno: nota grande en
// font-display + max_score sutil + feedback en parrafo.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Assignment, Grading } from "../types";

interface GradeDisplayProps {
  grading: Grading;
  assignment: Assignment;
}

export function GradeDisplay({ grading, assignment }: GradeDisplayProps) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/50">
      <CardHeader>
        <CardTitle className="text-lg">Calificación</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-black tracking-tight text-emerald-700">
              {grading.final_grade}
            </span>
            <span className="text-lg text-muted-foreground">
              / {assignment.max_score}
            </span>
          </div>
          {assignment.max_score > 0 && (
            <p className="text-sm text-muted-foreground">
              {Math.round(
                (grading.final_grade / assignment.max_score) * 100,
              )}
              %
            </p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Feedback del docente
          </p>
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {grading.feedback}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
