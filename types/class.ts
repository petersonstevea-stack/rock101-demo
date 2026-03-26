import type { SchoolId } from "@/data/schools";
import type { SongReadinessEntry } from "@/types/songReadiness";

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
  songProgress?: Record<string, SongReadinessEntry>;

  performanceTitle: string;
  performanceDate: string;

  directorFeedback?: string;
};