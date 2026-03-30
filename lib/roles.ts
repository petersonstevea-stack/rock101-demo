export const ROLES = {
  OWNER: "owner",
  GENERAL_MANAGER: "generalManager",
  DIRECTOR: "director",
  INSTRUCTOR: "instructor",
  PARENT: "parent",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  generalManager: "General Manager",
  director: "Class Instructor",
  instructor: "Instructor",
  parent: "Parent",
};