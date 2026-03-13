export type UserRole =
  | "parent"
  | "instructor"
  | "director"
  | "generalManager";

export type UserStatus = "active" | "invited" | "disabled";

export type AppUser = {
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  invitedAt?: string;
  invitedBy?: string;
};