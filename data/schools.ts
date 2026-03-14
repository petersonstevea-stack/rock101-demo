export const schools = [
  { id: "encinitas", name: "School of Rock Encinitas" },
  { id: "del-mar", name: "School of Rock Del Mar" },
  { id: "scripps-ranch", name: "School of Rock Scripps Ranch" },
] as const;

export type SchoolId = (typeof schools)[number]["id"];