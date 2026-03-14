import type { SchoolId } from "@/data/schools";

export type UserRole =
  | "owner"
  | "generalManager"
  | "director"
  | "instructor"
  | "parent";

export type UserStatus = "active" | "inactive" | "invited";

export type AppUser = {
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  schoolId?: SchoolId;
  invitedAt?: string;
  invitedBy?: string;
};