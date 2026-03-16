import { RockClass } from "@/types/class";
import {
  SONG_READINESS_LEVELS,
  type SongReadinessValue,
} from "@/types/songReadiness";

const CLASSES_KEY = "rock101-classes";

function createDefaultSongProgress(songs: string[]) {
  return Object.fromEntries(
    songs.map((song) => [
      song,
      {
        readiness: 1 as SongReadinessValue,
        updatedAt: null,
      },
    ])
  );
}

function normalizeSongProgress(
  songs: string[],
  existingSongProgress: any
): NonNullable<RockClass["songProgress"]> {
  const normalizedSongs = Array.isArray(songs) ? songs : [];

  return Object.fromEntries(
    normalizedSongs.map((song) => {
      const existing = existingSongProgress?.[song];
      const readiness = existing?.readiness;

      const safeReadiness: SongReadinessValue =
        typeof readiness === "number" &&
        readiness >= 1 &&
        readiness <= SONG_READINESS_LEVELS.length
          ? (readiness as SongReadinessValue)
          : 1;

      return [
        song,
        {
          readiness: safeReadiness,
          updatedAt:
            typeof existing?.updatedAt === "string" || existing?.updatedAt === null
              ? existing.updatedAt
              : null,
        },
      ];
    })
  );
}

/**
 * Ensures older saved classes are upgraded to the current schema
 */
function normalizeClass(rockClass: any): RockClass {
  const songs = Array.isArray(rockClass.songs) ? rockClass.songs : [];

  return {
    id: rockClass.id ?? crypto.randomUUID(),

    schoolId: rockClass.schoolId ?? "del-mar",

    name: rockClass.name ?? "Unnamed Class",
    dayOfWeek: rockClass.dayOfWeek ?? "Monday",
    time: rockClass.time ?? "",
    directorEmail: rockClass.directorEmail ?? "",
    instructorEmail: rockClass.instructorEmail ?? "",
    studentIds: Array.isArray(rockClass.studentIds) ? rockClass.studentIds : [],

    studentNames: Array.isArray(rockClass.studentNames)
      ? rockClass.studentNames
      : [],

    songs,

    songProgress: normalizeSongProgress(
      songs,
      rockClass.songProgress ?? createDefaultSongProgress(songs)
    ),

    performanceTitle: rockClass.performanceTitle ?? "",
    performanceDate: rockClass.performanceDate ?? "",
  };
}

export function getSavedClasses(): RockClass[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(CLASSES_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed.map(normalizeClass);
  } catch {
    return [];
  }
}

export function saveClasses(classes: RockClass[]) {
  if (typeof window === "undefined") return;

  const normalized = classes.map(normalizeClass);

  localStorage.setItem(CLASSES_KEY, JSON.stringify(normalized));
}