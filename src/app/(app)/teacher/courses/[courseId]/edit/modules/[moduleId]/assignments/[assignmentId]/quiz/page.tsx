// Editor de quiz (Bloque 23.2.c). Sub-pagina del editor de modulos
// que aparece SOLO para assignments tipo quiz_multiple_choice.
//
// Ruta:
//   /teacher/courses/[id]/edit/modules/[mid]/assignments/[aid]/quiz
//
// Breadcrumbs:
//   Panel docente / Editar contenido / Módulo N / [Quiz title] /
//   Preguntas
//
// El service quizEditorService.listQuizContent valida policy +
// type=quiz_multiple_choice; si la URL apunta a un assignment de
// otro tipo, redirige a notFound.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, ListChecks } from "lucide-react";
import { profileRepository } from "@/modules/auth/data/profile.repository";
import { panelHomeFor, panelLabelFor } from "@/modules/auth/policies";
import {
  courseRepository,
  moduleRepository,
} from "@/modules/courses/data";
import { assignmentRepository } from "@/modules/assignments/data/assignment.repository";
import { quizEditorService } from "@/modules/courses/services/quiz-editor.service";
import { QuizQuestionFormDialog } from "@/modules/courses/components/editor/quiz-question-form-dialog";
import { DeleteQuizQuestionDialog } from "@/modules/courses/components/editor/delete-quiz-question-dialog";
import { ReorderQuizQuestionButtons } from "@/modules/courses/components/editor/reorder-quiz-question-buttons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireUuidParam } from "@/lib/utils/params";

interface QuizEditPageProps {
  params: Promise<{
    courseId: string;
    moduleId: string;
    assignmentId: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function QuizEditPage({ params }: QuizEditPageProps) {
  const raw = await params;
  const courseId = requireUuidParam(raw.courseId);
  const moduleId = requireUuidParam(raw.moduleId);
  const assignmentId = requireUuidParam(raw.assignmentId);

  const user = await profileRepository.getCurrentUser();
  if (!user) redirect("/login");

  // Resolver el shell de la pagina (course + module + assignment)
  // en paralelo. La policy + type-check los hace el service via
  // listQuizContent (no duplicamos aqui).
  const [course, module, assignment] = await Promise.all([
    courseRepository.findById(courseId),
    moduleRepository.findById(moduleId),
    assignmentRepository.findById(assignmentId),
  ]);

  // Coherencia de breadcrumbs: si alguien manipula la URL para que
  // el assignmentId no este en el moduleId / courseId del path,
  // notFound. La policy aun va a fallar en el service, pero esto
  // evita renderizar un breadcrumb mal armado antes.
  if (
    !course ||
    !module ||
    !assignment ||
    module.course_id !== courseId ||
    assignment.module_id !== moduleId
  ) {
    notFound();
  }

  const contentResult = await quizEditorService.listQuizContent({
    user,
    assignmentId,
  });
  if (!contentResult.ok) {
    // Cualquier error del service (policy fail, type mismatch, not
    // found) cae a 404 en lugar de exponer detalle.
    notFound();
  }
  const questions = contentResult.value;

  const totalPoints = questions.reduce(
    (acc, row) => acc + Number(row.question.points ?? 0),
    0,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <nav
        aria-label="Ruta"
        className="text-xs font-black uppercase tracking-widest text-muted-foreground"
      >
        <Link href={panelHomeFor(user)} className="hover:text-foreground">
          {panelLabelFor(user)}
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/teacher/courses/${courseId}/edit`}
          className="hover:text-foreground"
        >
          Editar contenido
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/teacher/courses/${courseId}/edit/modules/${moduleId}`}
          className="hover:text-foreground"
        >
          Módulo {module.position}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Preguntas</span>
      </nav>

      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          {course.title}
        </p>
        <h1 className="font-display text-3xl font-black tracking-tight">
          {assignment.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestiona las preguntas del quiz. Cada pregunta tiene entre 2 y
          6 opciones, exactamente una marcada como correcta. La
          calificación se normaliza a {Number(assignment.max_score)} pts.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <ListChecks className="h-4 w-4" />
            {questions.length} pregunta
            {questions.length === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            Suma de puntos:{" "}
            <span className="font-semibold text-foreground">
              {totalPoints}
            </span>
          </span>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold tracking-tight">
            Preguntas
          </h2>
          <QuizQuestionFormDialog
            mode="create"
            assignmentId={assignmentId}
          />
        </div>

        {questions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Este quiz aún no tiene preguntas. Crea la primera con el
              botón &quot;Nueva pregunta&quot;.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {questions.map((row, idx) => {
              const sortedOptions = row.options
                .slice()
                .sort((a, b) => a.position - b.position);
              return (
                <li key={row.question.id}>
                  <Card>
                    <CardContent className="space-y-3 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <ReorderQuizQuestionButtons
                            questionId={row.question.id}
                            canMoveUp={idx > 0}
                            canMoveDown={idx < questions.length - 1}
                          />
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                Pregunta {row.question.position}
                              </span>
                              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                {Number(row.question.points)} pts
                              </span>
                            </div>
                            <p className="text-base font-medium">
                              {row.question.prompt}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <QuizQuestionFormDialog
                            mode="edit"
                            assignmentId={assignmentId}
                            question={row.question}
                            options={row.options}
                          />
                          <DeleteQuizQuestionDialog
                            questionId={row.question.id}
                            questionPrompt={row.question.prompt}
                          />
                        </div>
                      </div>
                      <ul className="space-y-1 pl-4">
                        {sortedOptions.map((opt) => (
                          <li
                            key={opt.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="text-muted-foreground">
                              {String.fromCharCode(64 + opt.position)}.
                            </span>
                            <span
                              className={
                                opt.is_correct
                                  ? "font-medium text-foreground"
                                  : "text-muted-foreground"
                              }
                            >
                              {opt.label}
                            </span>
                            {opt.is_correct && (
                              <Badge
                                variant="secondary"
                                className="bg-emerald-100 text-emerald-700"
                              >
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Correcta
                              </Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {questions.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Un quiz sin preguntas no puede ser entregado por los alumnos.
          Agrega al menos una pregunta para habilitarlo.
        </p>
      )}
    </div>
  );
}
