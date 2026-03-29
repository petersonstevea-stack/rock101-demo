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

    schoolId: rockClass.schoolId ?? "",

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

  const normalized = classes.map((rockClass) => {
    const normalizedClass = normalizeClass(rockClass);

    if (!normalizedClass.schoolId) {
      throw new Error("Cannot save class without schoolId");
    }

    return normalizedClass;
  });

  localStorage.setItem(CLASSES_KEY, JSON.stringify(normalized));
}
export function getClassesBySchool(schoolId: string): RockClass[] {
  if (!schoolId) {
    throw new Error("getClassesBySchool requires schoolId");
  }

  const allClasses = getSavedClasses();

  return allClasses.filter((c) => c.schoolId === schoolId);
}
import { supabase } from "@/lib/supabaseClient";

export async function getThisWeeksSessions(schoolId: string) {
  const today = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(today.getDate() + 7);

  const { data, error } = await supabase
    .from("class_sessions")
    .select(`
      id,
      session_date,
      start_time,
      status,
      director_feedback,
      rock_classes (
        id,
        name,
        school_id
      )
    `)
    .gte("session_date", today.toISOString().split("T")[0])
    .lt("session_date", sevenDaysFromNow.toISOString().split("T")[0]);

  if (error) {
    console.error("Error loading sessions:", error);
    return [];
  }

  return (data ?? []).filter(
    (s: any) => s.rock_classes?.school_id === schoolId
  );
}