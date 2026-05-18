"use client";

// Boton para marcar la leccion como completada. Recibe el estado
// `completed` pre-resuelto por el page server-side via
// lessonProgressRepository.hasCompleted (pattern consistente con
// signed URLs y user prop en otros lugares: el page server
// resuelve, el componente Client solo orquesta interaccion).
//
// Si completed=true: variante outline con icono Check y disabled.
// Si false: variante primary "Marcar como completada"; click llama
// la server action, muestra toast y refresca el route via
// router.refresh() para que el hasCompleted del page server
// rehidrate true.

import { useState } from "react";
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
  const [loading, setLoading] = useState(false);

  if (completed) {
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

  async function handleClick() {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className="w-full"
    >
      {loading ? "Guardando..." : "Marcar como completada"}
    </Button>
  );
}
