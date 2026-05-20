export {
  adminUserRepository,
  type CreatedAuthUser,
  type AuthUserLookup,
} from "./admin-user.repository";

export type UserListItem = {
  id: string;
  email: string;
  full_name: string;
  role: "student" | "teacher" | "admin";
  created_at: string;
  isSuspended: boolean;
};
