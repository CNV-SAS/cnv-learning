// Barrel export del modulo auth/policies. Permite imports limpios:
//   import { canAccessAdmin, canAccessTeacherPanel } from "@/modules/auth/policies";

export { canAccessAdmin } from "./can-access-admin";
export { canAccessTeacherPanel } from "./can-access-teacher-panel";
export { canAccessStudentArea } from "./can-access-student-area";
