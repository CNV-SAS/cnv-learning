// Types base del modulo assignments. Reuso de los Row generados
// por Supabase CLI (single source of truth del shape SQL).

import type { Database } from "@/types/database.generated";

export type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
export type AssignmentType =
  Database["public"]["Enums"]["assignment_type"];
export type Submission = Database["public"]["Tables"]["submissions"]["Row"];
export type Grading = Database["public"]["Tables"]["gradings"]["Row"];
export type QuizQuestion =
  Database["public"]["Tables"]["quiz_questions"]["Row"];
export type QuizOption =
  Database["public"]["Tables"]["quiz_options"]["Row"];
export type AiGradingSuggestion =
  Database["public"]["Tables"]["ai_grading_suggestions"]["Row"];
