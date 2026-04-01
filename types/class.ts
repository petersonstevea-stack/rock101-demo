import type { SongReadinessEntry } from "@/types/songReadiness";

export type RockClass = {
  id: string;
  schoolId: string;

  name: string;
  dayOfWeek: string;
  time: string;

  classInstructorEmail: string; // REQUIRED
  classInstructorId?: string | null;
  instructorEmail: string;

  studentIds: string[];
  studentNames: string[];

  songs: string[];
  songProgress?: Record<string, SongReadinessEntry>;

  performanceTitle: string;
  performanceDate: string;

  classInstructorNotes?: string;
};