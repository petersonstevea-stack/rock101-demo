import type {
  InstrumentId,
  ProgramId,
  SchoolType,
  StaffRole,
} from "@/data/reference/enrollmentOptions";

export type EnrollmentUserType = "staff" | "parent";

export type StaffFormValues = {
  name: string;
  email: string;
  role: StaffRole | "";
  school: string;
  schoolType: SchoolType | "";
};

export type StudentEnrollmentFormValues = {
  firstName: string;
  lastName: string;
  school: string;
  primaryProgramId: ProgramId | "";
  instrument: InstrumentId | "";
  instructorId: string;
  parentId: string;
  classAssignmentId: string;
};

export type ParentFormValues = {
  name: string;
  email: string;
};

export type EnrollmentWizardState = {
  schoolType: SchoolType | "";
  school: string;
  userType: EnrollmentUserType | "";
  staff: StaffFormValues;
  parent: ParentFormValues;
  student: StudentEnrollmentFormValues;
};

export type SelectOption = {
  value: string;
  label: string;
};