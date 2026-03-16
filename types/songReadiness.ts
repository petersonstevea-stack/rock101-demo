export const SONG_READINESS_LEVELS = [
  "Just Starting",
  "Getting There",
  "Mostly There",
  "Performance Ready",
  "Show Ready",
] as const;

export type SongReadinessLabel = (typeof SONG_READINESS_LEVELS)[number];

export type SongReadinessValue = 1 | 2 | 3 | 4 | 5;

export type SongReadinessEntry = {
  readiness: SongReadinessValue;
  updatedAt: string | null;
};