"use client";

// Par de flechas para reordenar una leccion (Bloque 19.3). Espejo
// del ReorderButtons de modulos: el patron es identico, solo cambia
// la action y el aria-label.

import { useTransition } from "react";
import { toast } from "sonner";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reorderLessonAction } from "@/modules/courses/server";

interface ReorderLessonButtonsProps {
  lessonId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function ReorderLessonButtons({
  lessonId,
  canMoveUp,
  canMoveDown,
}: ReorderLessonButtonsProps) {
  const [isPending, startTransition] = useTransition();

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      const result = await reorderLessonAction({ lessonId, direction });
      if (!result.ok) {
        toast.error(result.error.message);
      }
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
        aria-label="Subir lección"
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
        aria-label="Bajar lección"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
