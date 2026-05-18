"use client";

// Boton para marcar la leccion como completada. Recibe el estado
// `completed` pre-resuelto por el page server-side via
// lessonProgressRepository.hasCompleted (pattern consistente con
// signed URLs y user prop en otros lugares: el page server
// resuelve, el componente Client solo orquesta interaccion).
//
// useOptimistic + useTransition (sub-bloque 4.5-perf): el cambio
// visual a "Lección completada" ocurre inmediato al click, sin
// esperar router.refresh(). React revierte el state si la
// transition termina sin haber persistido (action fallida). El
// router.refresh() en background rehidrata el server component
// para que `completed` del prop converja al estado real.

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markLessonCompletedAction } from "@/modules/progress/server";

interface CompleteLessonButtonProps {
  lessonId: string;
  completed: boolean;
}

export function CompleteLessonButton({
  lessonId,
  completed,
}: CompleteLessonButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticCompleted, setOptimisticCompleted] = useOptimistic(
    completed,
    (_current, newState: boolean) => newState,
  );

  function handleClick() {
    startTransition(async () => {
      setOptimisticCompleted(true);
      try {
        const result = await markLessonCompletedAction({ lessonId });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        toast.success("Lección marcada como completada");
        router.refresh();
      } catch {
        toast.error("Error inesperado. Intenta de nuevo.");
      }
    });
  }

  if (optimisticCompleted) {
    return (
      <Button
        variant="outline"
        disabled
        className="w-full text-emerald-700"
      >
        <Check className="mr-2 h-4 w-4" />
        Lección completada
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      className="w-full"
    >
      {isPending ? "Guardando..." : "Marcar como completada"}
    </Button>
  );
}
