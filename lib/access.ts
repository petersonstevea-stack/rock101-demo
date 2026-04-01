import { hasRolePermission } from "./permissions";
import type { UserRole } from "./roles";

export type AppUser = {
  id: string;
  role: UserRole;
  school_id?: string | null;
  student_ids?: string[];
};

export type AppClass = {
  id: string;
  school_id: string;
  director_user_id: string;
};

export type StudentRecord = {
  id: string;
  school_id: string;
  class_id?: string | null;
  primary_instructor_user_id?: string | null;
};

export const isOwner = (user: AppUser | null | undefined) =>
  user?.role === "owner";

export const isGeneralManager = (user: AppUser | null | undefined) =>
  user?.role === "general_manager";

export const isAssignedDirectorForClass = (
  user: AppUser | null | undefined,
  currentClass: AppClass | null | undefined
) => {
  return (
    !!user &&
    !!currentClass &&
    user.role === "music_director" &&
    user.id === currentClass.director_user_id
  );
};

export const isPrimaryInstructorForStudent = (
  user: AppUser | null | undefined,
  student: StudentRecord | null | undefined
) => {
  return (
    !!user &&
    !!student &&
    user.role === "instructor" &&
    user.id === student.primary_instructor_user_id
  );
};

export const canEditGroupRehearsal = (
  user: AppUser | null | undefined,
  currentClass: AppClass | null | undefined
) => {
  if (!user || !currentClass) return false;

  return (
    hasRolePermission(user.role, "edit_group_rehearsal") &&
    (isAssignedDirectorForClass(user, currentClass) ||
      isGeneralManager(user) ||
      isOwner(user))
  );
};

export const canClickDirectorSignoff = (
  user: AppUser | null | undefined,
  currentClass: AppClass | null | undefined
) => {
  if (!user || !currentClass) return false;

  return (
    hasRolePermission(user.role, "click_director_signoff") &&
    (isAssignedDirectorForClass(user, currentClass) ||
      isGeneralManager(user) ||
      isOwner(user))
  );
};

export const canClickDirectorGraduationSignoff = (
  user: AppUser | null | undefined,
  currentClass: AppClass | null | undefined
) => {
  if (!user || !currentClass) return false;

  return (
    hasRolePermission(user.role, "click_director_graduation_signoff") &&
    (isAssignedDirectorForClass(user, currentClass) ||
      isGeneralManager(user) ||
      isOwner(user))
  );
};

export const canEditPrivateLesson = (
  user: AppUser | null | undefined,
  student: StudentRecord | null | undefined
) => {
  if (!user || !student) return false;

  return (
    hasRolePermission(user.role, "edit_private_lesson") &&
    (isPrimaryInstructorForStudent(user, student) ||
      isGeneralManager(user) ||
      isOwner(user))
  );
};

export const canClickInstructorSignoff = (
  user: AppUser | null | undefined,
  student: StudentRecord | null | undefined
) => {
  if (!user || !student) return false;

  return (
    hasRolePermission(user.role, "click_instructor_signoff") &&
    (isPrimaryInstructorForStudent(user, student) ||
      isGeneralManager(user) ||
      isOwner(user))
  );
};

export const canClickInstructorGraduationSignoff = (
  user: AppUser | null | undefined,
  student: StudentRecord | null | undefined
) => {
  if (!user || !student) return false;

  return (
    hasRolePermission(user.role, "click_instructor_graduation_signoff") &&
    (isPrimaryInstructorForStudent(user, student) ||
      isGeneralManager(user) ||
      isOwner(user))
  );
};

export const canEditGraduationRequirements = (
  user: AppUser | null | undefined
) => {
  if (!user) return false;
  return hasRolePermission(user.role, "edit_graduation_requirements");
};

export const canSubmitParentUpdate = (
  user: AppUser | null | undefined
) => {
  if (!user) return false;
  return hasRolePermission(user.role, "submit_parent_update");
};

export const canViewStudentAsParent = (
  user: AppUser | null | undefined,
  studentId: string | null | undefined
) => {
  if (!user || user.role !== "parent" || !studentId) return false;
  return (user.student_ids ?? []).includes(studentId);
};  