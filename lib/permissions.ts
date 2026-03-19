import type { UserRole } from "./roles";

export type Permission =
  | "view_parent_dashboard"
  | "view_private_lesson"
  | "edit_private_lesson"
  | "view_group_rehearsal"
  | "edit_group_rehearsal"
  | "view_graduation_requirements"
  | "edit_graduation_requirements"
  | "click_instructor_signoff"
  | "click_director_signoff"
  | "click_instructor_graduation_signoff"
  | "click_director_graduation_signoff"
  | "submit_parent_update"
  | "manage_classes"
  | "manage_rosters"
  | "manage_users"
  | "change_student_program"
  | "change_student_instructor"
  | "change_class_director";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    "view_parent_dashboard",
    "view_private_lesson",
    "edit_private_lesson",
    "view_group_rehearsal",
    "edit_group_rehearsal",
    "view_graduation_requirements",
    "edit_graduation_requirements",
    "click_instructor_signoff",
    "click_director_signoff",
    "click_instructor_graduation_signoff",
    "click_director_graduation_signoff",
    "submit_parent_update",
    "manage_classes",
    "manage_rosters",
    "manage_users",
    "change_student_program",
    "change_student_instructor",
    "change_class_director",
  ],
  generalManager: [
    "view_parent_dashboard",
    "view_private_lesson",
    "edit_private_lesson",
    "view_group_rehearsal",
    "edit_group_rehearsal",
    "view_graduation_requirements",
    "edit_graduation_requirements",
    "click_instructor_signoff",
    "click_director_signoff",
    "click_instructor_graduation_signoff",
    "click_director_graduation_signoff",
    "submit_parent_update",
    "manage_classes",
    "manage_rosters",
    "change_student_program",
    "change_student_instructor",
    "change_class_director",
  ],
  director: [
    "view_parent_dashboard",
    "view_private_lesson",
    "view_group_rehearsal",
    "edit_group_rehearsal",
    "view_graduation_requirements",
    "edit_graduation_requirements",
    "click_director_signoff",
    "click_director_graduation_signoff",
    "submit_parent_update",
    "manage_classes",
    "manage_rosters",
    "change_student_program",
    "change_student_instructor",
    "change_class_director",
  ],
    instructor: [
    "view_private_lesson",
    "edit_private_lesson",
    "view_group_rehearsal",
    "view_graduation_requirements",
    "edit_graduation_requirements",
    "click_instructor_signoff",
    "click_instructor_graduation_signoff",
    "submit_parent_update",
  ],
  parent: [
    "view_parent_dashboard",
    "view_private_lesson",
    "view_group_rehearsal",
    "view_graduation_requirements",
  ],
};

export const hasRolePermission = (
  role: UserRole,
  permission: Permission
): boolean => {
  return ROLE_PERMISSIONS[role].includes(permission);
};