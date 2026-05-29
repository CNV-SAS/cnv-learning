// Barrel export del modulo auth/policies. Permite imports limpios:
//   import { canAccessAdmin, canAccessTeacherPanel } from "@/modules/auth/policies";

export { canAccessAdmin } from "./can-access-admin";
export { canAccessTeacherPanel } from "./can-access-teacher-panel";
export { canAccessTeacherInbox } from "./can-access-teacher-inbox";
export { canAccessStudentArea } from "./can-access-student-area";
export { getNavigationFor, type NavItem } from "./navigation";
export { panelHomeFor, panelLabelFor } from "./panel-home";
