// Barrel export del modulo auth/server. Permite imports limpios:
//   import { loginAction, logoutAction } from "@/modules/auth/server";

export { loginAction } from "./login.action";
export { logoutAction } from "./logout.action";
export { forgotPasswordAction } from "./forgot-password.action";
export { resetPasswordAction } from "./reset-password.action";
