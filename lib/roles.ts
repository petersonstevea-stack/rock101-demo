export const ROLES = {
  OWNER: "owner",
  GENERAL_MANAGER: "general_manager",
  MUSIC_DIRECTOR: "music_director",
  INSTRUCTOR: "instructor",
  PARENT: "parent",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  general_manager: "General Manager",
  music_director: "Music Director",
  instructor: "Instructor",
  parent: "Parent",
};