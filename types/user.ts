export type UserRole =
  | "owner"
  | "general_manager"
  | "music_director"
  | "instructor"
  | "parent";

export type UserStatus = "active" | "inactive" | "invited";

export type AppUser = {
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  schoolId?: string;
  invitedAt?: string;
  invitedBy?: string;
};