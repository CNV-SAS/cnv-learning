"use client";

// Par de flechas para reordenar una pregunta de quiz (Bloque 23.2.c).
// Mismo patron que ReorderButtons (modulos) y ReorderLessonButtons.

import { useTransition } from "react";
import { toast } from "sonner";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { reorderQuizQuestionAction } from "@/modules/courses/server/reorder-quiz-question.action";

interface ReorderQuizQuestionButtonsProps {
  questionId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function ReorderQuizQuestionButtons({
  questionId,
  canMoveUp,
  canMoveDown,
}: ReorderQuizQuestionButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      const result = await reorderQuizQuestionAction({
        questionId,
        direction,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        disabled={!canMoveUp || isPending}
        onClick={() => handleMove("up")}
        aria-label="Subir pregunta"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        disabled={!canMoveDown || isPending}
        onClick={() => handleMove("down")}
        aria-label="Bajar pregunta"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
