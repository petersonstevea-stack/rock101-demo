import { RockClass } from "@/types/class";

const CLASSES_KEY = "rock101-classes";

export function getSavedClasses(): RockClass[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(CLASSES_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as RockClass[];
  } catch {
    return [];
  }
}

export function saveClasses(classes: RockClass[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLASSES_KEY, JSON.stringify(classes));
}