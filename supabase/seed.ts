// Seed determinístico para CNV Learning (DATABASE.md líneas 740-754).
//
// Crea 3 auth users (admin/teacher/student) via service role con UUIDs
// fijos. El trigger handle_new_user (migración 0002) materializa los
// profiles automáticamente leyendo full_name y role del user_metadata.
//
// Después inserta: 1 curso, 10 módulos con títulos reales del Diplomado,
// 30 lecciones placeholder (3 por módulo, type 'mixed', video + PDF
// attachment placeholder), 10 assignments (3 file_upload + 4 essay + 3
// quiz_multiple_choice), 9 quiz_questions + 36 quiz_options, 2 forums
// vacíos por curso, asignación del docente al curso, enrollment del
// estudiante.
//
// Asume BD vacía (sin idempotencia). Uso normal: supabase db reset
// (cuando aplique) y luego este seed.
//
// Ejecución:
//   $env:NEXT_PUBLIC_SUPABASE_URL = ...
//   $env:SUPABASE_SERVICE_ROLE_KEY = ...
//   $env:SEED_ADMIN_PASSWORD = ...
//   $env:SEED_TEACHER_PASSWORD = ...
//   $env:SEED_STUDENT_PASSWORD = ...
//   pnpm dlx tsx supabase/seed.ts

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.generated";

type TableName = keyof Database["public"]["Tables"];
type InsertRow<T extends TableName> =
  Database["public"]["Tables"][T]["Insert"];

// ============================================================
// Env vars y validación
// ============================================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PW = process.env.SEED_ADMIN_PASSWORD;
const TEACHER_PW = process.env.SEED_TEACHER_PASSWORD;
const STUDENT_PW = process.env.SEED_STUDENT_PASSWORD;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "ERROR: faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}
if (!ADMIN_PW || !TEACHER_PW || !STUDENT_PW) {
  console.error(
    "ERROR: faltan SEED_ADMIN_PASSWORD / SEED_TEACHER_PASSWORD / SEED_STUDENT_PASSWORD"
  );
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================
// UUIDs fixtures (patrón 00000000-...-XXXXXXXXXXXX)
// ============================================================
const id = (n: number): string =>
  `00000000-0000-0000-0000-${n.toString().padStart(12, "0")}`;

const USER = {
  admin: {
    id: id(1),
    email: "sau.idk001@gmail.com",
    name: "Santiago Uribe",
    role: "admin" as const,
    pw: ADMIN_PW,
  },
  teacher: {
    id: id(2),
    email: "sau.idk001+teacher@gmail.com",
    name: "Docente de Prueba",
    role: "teacher" as const,
    pw: TEACHER_PW,
  },
  student: {
    id: id(3),
    email: "sau.idk001+student@gmail.com",
    name: "Estudiante de Prueba",
    role: "student" as const,
    pw: STUDENT_PW,
  },
};

const COURSE_ID = id(10);

// Rango 100-109: modules
const moduleId = (m: number): string => id(100 + m);
// Rango 200-229: lessons (m*3 + l)
const lessonId = (m: number, l: number): string => id(200 + m * 3 + l);
// Rango 300-329: lesson_attachments (m*3 + l)
const attachId = (m: number, l: number): string => id(300 + m * 3 + l);
// Rango 400-409: assignments
const assignId = (m: number): string => id(400 + m);
// Rango 500-508: quiz_questions (solo módulos 7,8,9 con index local)
const questId = (m: number, q: number): string => id(500 + (m - 7) * 3 + q);
// Rango 600-635: quiz_options
const optionId = (m: number, q: number, o: number): string =>
  id(600 + (m - 7) * 12 + q * 4 + o);
// Rango 700-701: forums
const forumId = (i: number): string => id(700 + i);

// ============================================================
// Datos
// ============================================================
const MODULE_TITLES: readonly string[] = [
  "Fundamentos de Bioimpedancia y Medicina Bioeléctrica",
  "El Modelo ANI BIS-E: Conceptos y Estructura",
  "BiodyXpert ZM3: Calibración, Medición y Protocolo Clínico",
  "Índice de Función Celular (IFC): Interpretación y Aplicaciones",
  "Índice de Riesgo Celular (IRC): Análisis y Clasificación",
  "PABU e Indicadores Bioeléctricos Avanzados",
  "Composición Corporal: Interpretación Clínica Integradora",
  "Hidratación y Balance Hídrico en Bioimpedancia",
  "Rutas de Atención y Protocolos del Modelo ANI BIS-E",
  "Reportes, Historial Clínico y Casos Prácticos",
];

const ASSIGNMENT_TYPES = [
  "file_upload",
  "file_upload",
  "file_upload",
  "essay",
  "essay",
  "essay",
  "essay",
  "quiz_multiple_choice",
  "quiz_multiple_choice",
  "quiz_multiple_choice",
] as const;

const VIDEO_URL = "https://www.youtube.com/embed/jNQXAC9IVRw";

// ============================================================
// Helpers
// ============================================================
async function step(label: string, fn: () => Promise<void>): Promise<void> {
  process.stdout.write(`  ${label}... `);
  try {
    await fn();
    console.log("OK");
  } catch (e) {
    console.log("FAIL");
    throw e;
  }
}

async function insertRows<T extends TableName>(
  table: T,
  rows: InsertRow<T>[]
): Promise<void> {
  // Cast localizado: el generic T de la firma publica NO se propaga a
  // la inferencia interna de supabase.from(table).insert(rows). Es una
  // limitacion conocida del builder pattern de @supabase/supabase-js
  // con generics: from(table: T) donde T es no-resuelto devuelve el
  // union completo de tablas, y .insert(rows) espera el shape del union,
  // no de T. La firma publica del helper mantiene type-safety end-to-end:
  // cada caller con literal de tabla valida sus rows contra Insert<T>.
  const { error } = await supabase.from(table).insert(rows as never);
  if (error) throw new Error(`insert ${table}: ${error.message}`);
}

// ============================================================
// Steps
// ============================================================
async function createAuthUsers(): Promise<void> {
  for (const u of Object.values(USER)) {
    const { error } = await supabase.auth.admin.createUser({
      id: u.id,
      email: u.email,
      password: u.pw,
      email_confirm: true,
      user_metadata: { full_name: u.name, role: u.role },
    });
    if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
  }
  // El trigger handle_new_user crea profiles automáticamente con role
  // del user_metadata. No insertamos en profiles manualmente.
}

async function createCourse(): Promise<void> {
  await insertRows("courses", [
    {
      id: COURSE_ID,
      slug: "medicina-bioelectrica-ani-bis-e",
      title: "Diplomado de Medicina Bioeléctrica y Sistema ANI BIS-E",
      description:
        "Diplomado completo para profesionales de la salud sobre bioimpedancia, modelo ANI BIS-E y aplicación clínica del BiodyXpert ZM3.",
      is_published: true,
    },
  ]);
}

async function assignTeacher(): Promise<void> {
  await insertRows("course_teachers", [
    { course_id: COURSE_ID, teacher_id: USER.teacher.id },
  ]);
}

async function createModules(): Promise<void> {
  await insertRows(
    "modules",
    MODULE_TITLES.map((title, m) => ({
      id: moduleId(m),
      course_id: COURSE_ID,
      title,
      position: m + 1,
      weight: 1,
    }))
  );
}

async function createLessons(): Promise<void> {
  const lessons: InsertRow<"lessons">[] = [];
  for (let m = 0; m < 10; m++) {
    for (let l = 0; l < 3; l++) {
      lessons.push({
        id: lessonId(m, l),
        module_id: moduleId(m),
        title: `Lección ${l + 1} del Módulo ${m + 1}`,
        type: "mixed",
        content_markdown: `Contenido placeholder para la lección ${
          l + 1
        } del módulo ${m + 1}. Este texto se reemplazará con el contenido real en producción.`,
        video_url: VIDEO_URL,
        position: l + 1,
        duration_minutes: 15,
      });
    }
  }
  await insertRows("lessons", lessons);
}

async function createAttachments(): Promise<void> {
  const attachments: InsertRow<"lesson_attachments">[] = [];
  for (let m = 0; m < 10; m++) {
    for (let l = 0; l < 3; l++) {
      attachments.push({
        id: attachId(m, l),
        lesson_id: lessonId(m, l),
        storage_path: `placeholders/module-${m + 1}-lesson-${l + 1}.pdf`,
        display_name: `Material Módulo ${m + 1}, Lección ${l + 1}.pdf`,
        mime_type: "application/pdf",
        size_bytes: 0,
        position: 0,
      });
    }
  }
  await insertRows("lesson_attachments", attachments);
}

async function createAssignments(): Promise<void> {
  const assignments: InsertRow<"assignments">[] = ASSIGNMENT_TYPES.map((type, m) => ({
    id: assignId(m),
    module_id: moduleId(m),
    title: `Tarea Módulo ${m + 1}`,
    description: `Descripción placeholder de la tarea ${type} del módulo ${
      m + 1
    }.`,
    type,
    max_score: 100,
    is_required: true,
  }));
  await insertRows("assignments", assignments);
}

async function createQuizzes(): Promise<void> {
  const questions: InsertRow<"quiz_questions">[] = [];
  const options: InsertRow<"quiz_options">[] = [];
  for (const m of [7, 8, 9]) {
    for (let q = 0; q < 3; q++) {
      questions.push({
        id: questId(m, q),
        assignment_id: assignId(m),
        prompt: `Pregunta ${q + 1} del quiz del Módulo ${m + 1}`,
        position: q + 1,
        points: 1,
      });
      for (let o = 0; o < 4; o++) {
        options.push({
          id: optionId(m, q, o),
          question_id: questId(m, q),
          label: `Opción ${String.fromCharCode(65 + o)}`,
          is_correct: o === 0,
          position: o + 1,
        });
      }
    }
  }
  await insertRows("quiz_questions", questions);
  await insertRows("quiz_options", options);
}

async function createForums(): Promise<void> {
  await insertRows("forums", [
    {
      id: forumId(0),
      course_id: COURSE_ID,
      slug: "presentacion",
      title: "Foro de Presentación",
      description:
        "Espacio para presentarse y conocer a otros participantes del diplomado.",
      position: 0,
    },
    {
      id: forumId(1),
      course_id: COURSE_ID,
      slug: "dudas",
      title: "Dudas e Inquietudes",
      description:
        "Espacio para resolver dudas académicas y técnicas del curso.",
      position: 1,
    },
  ]);
}

async function enrollStudent(): Promise<void> {
  await insertRows("enrollments", [
    {
      user_id: USER.student.id,
      course_id: COURSE_ID,
      enrolled_by: USER.admin.id,
      is_active: true,
    },
  ]);
}

// ============================================================
// Main
// ============================================================
async function main(): Promise<void> {
  console.log("\nSeeding CNV Learning...\n");
  await step("Auth users + profiles (via trigger)", createAuthUsers);
  await step("Course", createCourse);
  await step("Teacher assignment", assignTeacher);
  await step("10 Modules", createModules);
  await step("30 Lessons", createLessons);
  await step("30 Lesson attachments", createAttachments);
  await step("10 Assignments", createAssignments);
  await step("9 Quiz questions + 36 Quiz options", createQuizzes);
  await step("2 Forums", createForums);
  await step("Student enrollment", enrollStudent);
  console.log("\nSeed complete.\n");
}

main().catch((e: unknown) => {
  console.error("\nSeed failed:", e);
  process.exit(1);
});
