export type SchoolType = "franchise" | "corporate";

export type SchoolSlug = "del-mar" | "encinitas" | "scripps-ranch";

export type ProgramId =
  | "rock101"
  | "performance_program"
  | "rookies"
  | "little_wing"
  | "camps";

export type InstrumentId = "guitar" | "bass" | "drums" | "keys" | "vocals";

export type StaffRole = "owner" | "gm" | "director" | "instructor";

export type Option<T extends string> = {
  value: T;
  label: string;
};

export const SCHOOL_TYPE_OPTIONS: Option<SchoolType>[] = [
  { value: "franchise", label: "Franchise" },
  { value: "corporate", label: "Corporate" },
];

export const SCHOOL_OPTIONS: Option<SchoolSlug>[] = [
  { value: "del-mar", label: "Del Mar" },
  { value: "encinitas", label: "Encinitas" },
  { value: "scripps-ranch", label: "Scripps Ranch" },
];

export const PROGRAM_OPTIONS: Option<ProgramId>[] = [
  { value: "rock101", label: "Rock 101" },
  { value: "performance_program", label: "Performance Program" },
  { value: "rookies", label: "Rookies" },
  { value: "little_wing", label: "Little Wing" },
  { value: "camps", label: "Camps" },
];

export const INSTRUMENT_OPTIONS: Option<InstrumentId>[] = [
  { value: "guitar", label: "Guitar" },
  { value: "bass", label: "Bass" },
  { value: "drums", label: "Drums" },
  { value: "keys", label: "Keys" },
  { value: "vocals", label: "Vocals" },
];

export const STAFF_ROLE_OPTIONS: Option<StaffRole>[] = [
  { value: "owner", label: "Owner" },
  { value: "gm", label: "GM" },
  { value: "director", label: "Director" },
  { value: "instructor", label: "Instructor" },
];

export function getSchoolLabel(value: SchoolSlug): string {
  return SCHOOL_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getProgramLabel(value: ProgramId): string {
  return PROGRAM_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function getInstrumentLabel(value: InstrumentId): string {
  return (
    INSTRUMENT_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

export function getStaffRoleLabel(value: StaffRole): string {
  return (
    STAFF_ROLE_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}