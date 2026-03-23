import type { Option, SchoolSlug } from "@/data/reference/enrollmentOptions";

export type ClassGroupId =
  | "del_mar_monday_madness"
  | "del_mar_tuesday_titans"
  | "encinitas_wednesday_warriors"
  | "scripps_ranch_thursday_thunder";

export type ClassGroupOption = Option<ClassGroupId> & {
  school: SchoolSlug;
};

export const CLASS_GROUP_OPTIONS: ClassGroupOption[] = [
  {
    value: "del_mar_monday_madness",
    label: "Monday Madness",
    school: "del_mar",
  },
  {
    value: "del_mar_tuesday_titans",
    label: "Tuesday Titans",
    school: "del_mar",
  },
  {
    value: "encinitas_wednesday_warriors",
    label: "Wednesday Warriors",
    school: "encinitas",
  },
  {
    value: "scripps_ranch_thursday_thunder",
    label: "Thursday Thunder",
    school: "scripps_ranch",
  },
];