"use client";

// GraderSection: wrapper Client que compone SuggestionPanel +
// GraderForm con state local de "aplicada". Necesario porque
// el grader page es Server Component y no puede mantener state
// para sincronizar entre los dos children.
//
// State: appliedSuggestion = los valores que el docente eligio
// aplicar al formulario via SuggestionPanel.onApply. Se pasa al
// GraderForm como initial* props. El form sincroniza via
// useEffect (sobreescribe lo escrito, decision intencional
// documentada en grader-form.tsx).

import { useState } from "react";
import { SuggestionPanel } from "./suggestion-panel";
import { GraderForm } from "./grader-form";
import type { AiGradingSuggestion } from "@/modules/assignments/types";

interface AppliedSuggestion {
  grade: string;
  feedback: string;
  suggestionId: string;
}

interface GraderSectionProps {
  submissionId: string;
  assignmentType: "file_upload" | "essay" | "quiz_multiple_choice";
  maxScore: number;
  initialSuggestion: AiGradingSuggestion | null;
}

export function GraderSection({
  submissionId,
  assignmentType,
  maxScore,
  initialSuggestion,
}: GraderSectionProps) {
  const [applied, setApplied] = useState<AppliedSuggestion | null>(null);

  return (
    <div className="space-y-6">
      <SuggestionPanel
        submissionId={submissionId}
        assignmentType={assignmentType}
        initialSuggestion={initialSuggestion}
        onApply={({ grade, feedback, suggestionId }) =>
          setApplied({
            grade: String(grade),
            feedback,
            suggestionId,
          })
        }
      />
      <GraderForm
        // key fuerza re-mount del form cuando cambia el suggestion
        // aplicado, asi el state local se inicializa con los
        // initialGrade/initialFeedback nuevos sin necesidad de
        // useEffect + setState (rule react-hooks/set-state-in-effect
        // de React 19). Trade-off intencional: si el docente habia
        // escrito algo sin aplicar y luego aplica, se sobreescribe
        // (comportamiento esperado per plan 8.4).
        key={applied?.suggestionId ?? "manual"}
        submissionId={submissionId}
        maxScore={maxScore}
        initialGrade={applied?.grade}
        initialFeedback={applied?.feedback}
        aiSuggestionId={applied?.suggestionId}
      />
    </div>
  );
}
