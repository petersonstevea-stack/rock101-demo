import type { SchoolId } from "@/data/schools";

export type RockClass = {
  id: string;
  schoolId: SchoolId;

  name: string;
  dayOfWeek: string;
  time: string;

  directorEmail: string; // REQUIRED
  instructorEmail: string;

  studentIds: string[];
  studentNames: string[];

  songs: string[];

  performanceTitle: string;
  performanceDate: string;
};