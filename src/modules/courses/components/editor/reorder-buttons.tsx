"use client";

// Par de flechas para reordenar un modulo. Cada click invoca
// reorderModuleAction con direction. Server action hace
// revalidatePath del editor del curso para refrescar.

import { useTransition } from "react";
import { toast } from "sonner";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reorderModuleAction } from "@/modules/courses/server";

interface ReorderButtonsProps {
  moduleId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function ReorderButtons({
  moduleId,
  canMoveUp,
  canMoveDown,
}: ReorderButtonsProps) {
  const [isPending, startTransition] = useTransition();

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      const result = await reorderModuleAction({ moduleId, direction });
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
        aria-label="Subir módulo"
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
        aria-label="Bajar módulo"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
