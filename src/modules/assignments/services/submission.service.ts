// Service: orquestador de envíos. ARCHITECTURE.md regla 2 (actions
// thin llaman service; logica de negocio aqui).
//
// Reglas comunes:
//   - canSubmitAssignment policy aplica (rol student + deadline).
//   - assignment.type debe coincidir con el metodo invocado.
//   - Si existe submission previa con status='submitted', error
//     SUBMISSION_ALREADY_SUBMITTED (MVP: una sola entrega por
//     assignment; reenvio post-submitted bloqueado por RLS + chequeo
//     defensivo aqui).
//
// Para file_upload: validar size + MIME ANTES de subir, subir via
// storage helper, si habia archivo previo (draft) borrarlo
// fault-tolerant, upsert submission con status='submitted'.

import {
  assignmentRepository,
  submissionRepository,
  submissionStorageRepository,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
} from "@/modules/assignments/data";
import { canSubmitAssignment } from "@/modules/assignments/policies";
import {
  AppError,
  AuthorizationError,
  DomainError,
  ValidationError,
} from "@/core/errors/classes";
import { ErrorCodes } from "@/core/errors/codes";
import { ok, err, type Result } from "@/lib/utils/result";
import type { AuthenticatedUser } from "@/modules/auth/types";
import type { Submission } from "../types";

interface SubmitFileParams {
  user: AuthenticatedUser;
  assignmentId: string;
  file: File;
}

interface SubmitEssayParams {
  user: AuthenticatedUser;
  assignmentId: string;
  essayText: string;
}

export const submissionService = {
  async submitFileAssignment(
    params: SubmitFileParams,
  ): Promise<Result<Submission, AppError>> {
    const { user, assignmentId, file } = params;

    const assignment = await assignmentRepository.findById(assignmentId);
    const allowed = canSubmitAssignment(user, {
      assignmentExists: assignment !== null,
      dueAt: assignment?.due_at ? new Date(assignment.due_at) : null,
    });
    if (!allowed || !assignment) {
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_SUBMIT_ASSIGNMENT,
          "No puedes entregar esta tarea (no disponible o fuera de plazo).",
        ),
      );
    }

    if (assignment.type !== "file_upload") {
      return err(
        new DomainError(
          ErrorCodes.ASSIGNMENT_TYPE_MISMATCH,
          "Esta tarea no acepta archivos.",
        ),
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return err(
        new ValidationError(
          ErrorCodes.FILE_TOO_LARGE,
          `El archivo excede el tamaño máximo (${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB).`,
        ),
      );
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return err(
        new ValidationError(
          ErrorCodes.FILE_TYPE_INVALID,
          "Tipo de archivo no permitido. Solo PDF, DOCX o ODT.",
        ),
      );
    }

    const existing = await submissionRepository.findByAssignmentAndUser(
      assignmentId,
      user.id,
    );
    if (existing && existing.status === "submitted") {
      return err(
        new DomainError(
          ErrorCodes.SUBMISSION_ALREADY_SUBMITTED,
          "Ya entregaste esta tarea.",
        ),
      );
    }

    const { storagePath } = await submissionStorageRepository.uploadFile(
      user.id,
      assignmentId,
      file,
    );

    // Si habia archivo previo (draft), borrar fault-tolerant.
    if (existing?.storage_path) {
      await submissionStorageRepository.deleteFile(existing.storage_path);
    }

    const submission = await submissionRepository.upsert({
      assignment_id: assignmentId,
      user_id: user.id,
      status: "submitted",
      storage_path: storagePath,
      submitted_at: new Date().toISOString(),
    });

    return ok(submission);
  },

  async submitEssayAssignment(
    params: SubmitEssayParams,
  ): Promise<Result<Submission, AppError>> {
    const { user, assignmentId, essayText } = params;

    const assignment = await assignmentRepository.findById(assignmentId);
    const allowed = canSubmitAssignment(user, {
      assignmentExists: assignment !== null,
      dueAt: assignment?.due_at ? new Date(assignment.due_at) : null,
    });
    if (!allowed || !assignment) {
      return err(
        new AuthorizationError(
          ErrorCodes.AUTHZ_CANNOT_SUBMIT_ASSIGNMENT,
          "No puedes entregar esta tarea (no disponible o fuera de plazo).",
        ),
      );
    }

    if (assignment.type !== "essay") {
      return err(
        new DomainError(
          ErrorCodes.ASSIGNMENT_TYPE_MISMATCH,
          "Esta tarea no acepta entrega tipo ensayo.",
        ),
      );
    }

    const existing = await submissionRepository.findByAssignmentAndUser(
      assignmentId,
      user.id,
    );
    if (existing && existing.status === "submitted") {
      return err(
        new DomainError(
          ErrorCodes.SUBMISSION_ALREADY_SUBMITTED,
          "Ya entregaste esta tarea.",
        ),
      );
    }

    const submission = await submissionRepository.upsert({
      assignment_id: assignmentId,
      user_id: user.id,
      status: "submitted",
      essay_text: essayText,
      submitted_at: new Date().toISOString(),
    });

    return ok(submission);
  },
};
