export type SchoolType = "franchise" | "corporate";

export type ProgramId =
  | "rock101"
  | "rock_101"
  | "performance_program"
  | "rookies"
  | "little_wing"
  | "camps"
  | "adult_band"
  | "lessons_only";

export type InstrumentId = "guitar" | "bass" | "drums" | "keys" | "vocals" | "other";

export type StaffRole = "owner" | "general_manager" | "music_director" | "instructor";

export type Option<T extends string> = {
  value: T;
  label: string;
};

export const SCHOOL_TYPE_OPTIONS: Option<SchoolType>[] = [
  { value: "franchise", label: "Franchise" },
  { value: "corporate", label: "Corporate" },
];

export const PROGRAM_OPTIONS: Option<ProgramId>[] = [
  { value: "rock_101", label: "Rock 101" },
  { value: "rock101", label: "Rock 101 (legacy)" },
  { value: "performance_program", label: "Performance Program" },
  { value: "rookies", label: "Rookies" },
  { value: "little_wing", label: "Little Wing" },
  { value: "camps", label: "Camps" },
  { value: "adult_band", label: "Adult Band" },
  { value: "lessons_only", label: "Lessons Only" },
];

export const INSTRUMENT_OPTIONS: Option<InstrumentId>[] = [
  { value: "guitar", label: "Guitar" },
  { value: "bass", label: "Bass" },
  { value: "drums", label: "Drums" },
  { value: "keys", label: "Keys" },
  { value: "vocals", label: "Vocals" },
  { value: "other", label: "Other" },
];

export const STAFF_ROLE_OPTIONS: Option<StaffRole>[] = [
  { value: "owner", label: "Owner" },
  { value: "general_manager", label: "General Manager" },
  { value: "music_director", label: "Music Director" },
  { value: "instructor", label: "Instructor" },
];

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