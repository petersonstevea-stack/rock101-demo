import { RockClass } from "@/types/class";

const CLASSES_KEY = "rock101-classes";

/**
 * Ensures older saved classes are upgraded to the current schema
 */
function normalizeClass(rockClass: any): RockClass {
  return {
    id: rockClass.id ?? crypto.randomUUID(),

    schoolId: rockClass.schoolId ?? "del-mar",

    name: rockClass.name ?? "Unnamed Class",
    dayOfWeek: rockClass.dayOfWeek ?? "Monday",
    time: rockClass.time ?? "",

    instructorEmail: rockClass.instructorEmail ?? "",

    studentIds: rockClass.studentIds ?? [],

    studentNames: rockClass.studentNames ?? [],

    songs: rockClass.songs ?? [],

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