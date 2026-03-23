import type {
  InstrumentId,
  ProgramId,
  SchoolSlug,
  SchoolType,
  StaffRole,
} from "@/data/reference/enrollmentOptions";

export type EnrollmentUserType = "staff" | "parent";

export type StaffFormValues = {
  name: string;
  email: string;
  role: StaffRole | "";
  school: SchoolSlug | "";
  schoolType: SchoolType | "";
};

export type StudentEnrollmentFormValues = {
  firstName: string;
  lastName: string;
  school: SchoolSlug | "";
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
  school: SchoolSlug | "";
  userType: EnrollmentUserType | "";
  staff: StaffFormValues;
  parent: ParentFormValues;
  student: StudentEnrollmentFormValues;
};

export type SelectOption = {
  value: string;
  label: string;
};