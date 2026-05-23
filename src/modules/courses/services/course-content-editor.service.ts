// Service: orquesta lecturas para el editor de contenidos del curso
// (Bloque 19). Las pages no acceden directo a multiples repositorios
// para evitar logica de aggregation en el route handler (CLAUDE.md
// regla 2). Service shell del 19.1: solo lista modulos con counts.
// 19.2+ agrega metodos para CRUD coordinado y aggregations adicionales.

import { moduleRepository } from "@/modules/courses/data";
import { lessonRepository } from "@/modules/courses/data";
import { assignmentRepository } from "@/modules/assignments/data";
import type { Module } from "@/modules/courses/types";

export interface ModuleWithCounts {
  module: Module;
  lessonCount: number;
  assignmentCount: number;
}

export const courseContentEditorService = {
  // Lista los modulos del curso con contadores de lecciones y tareas
  // por modulo, para el landing page del editor. N+1 controlado: 10
  // modulos maximo por curso, 2 queries por modulo = 21 round trips
  // worst case sobre Supabase free tier. Si crece, primer paso seria
  // un view o RPC con counts; por ahora la simplicidad gana.
  async listModulesWithCounts(courseId: string): Promise<ModuleWithCounts[]> {
    const modules = await moduleRepository.listByCourse(courseId);

    const entries = await Promise.all(
      modules.map(async (module) => {
        const [lessons, assignments] = await Promise.all([
          lessonRepository.listByModule(module.id),
          assignmentRepository.listByModule(module.id),
        ]);
        return {
          module,
          lessonCount: lessons.length,
          assignmentCount: assignments.length,
        };
      }),
    );

    return entries;
  },
};
