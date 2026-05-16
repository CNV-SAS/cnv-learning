// Barrel export del modulo auth/validations. Permite imports limpios:
//   import { loginSchema, type LoginInput } from "@/modules/auth/validations";

export { loginSchema, type LoginInput } from "./login";
export {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "./forgot-password";
export {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "./reset-password";
