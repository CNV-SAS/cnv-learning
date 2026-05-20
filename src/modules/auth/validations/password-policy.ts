// Politica de password compartida entre flows de auth:
//   - resetPasswordSchema (Bloque 2, /reset-password publico).
//   - changePasswordSchema (Bloque 16, /profile autenticado).
//
// Decision 4 del Bloque 2 (aprobada por Santiago el 2026-05-16):
// minimo 8 + al menos 1 letra + al menos 1 digito. SIN simbolos
// especiales obligatorios (B2C profesionales de salud).
//
// Single source of truth: si la politica cambia, actualizar aqui
// y los dos schemas que la importan validan automaticamente.

import { z } from "zod";

export const passwordPolicySchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[a-zA-Z]/, "Debe contener al menos una letra")
  .regex(/\d/, "Debe contener al menos un dígito");
