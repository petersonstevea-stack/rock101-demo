import { skillSections } from "@/data/curriculum";
import type { StudentRecord } from "@/types/student";

const SECTION_WEIGHTS = {
  instrument: 40,
  concepts: 20,
  assignments: 20,
  practicePerformance: 10,
  groupBehavior: 10,
} as const;

export function getCompletedCount(student: StudentRecord, items: readonly string[]) {
  return items.filter(
    (item) => student.curriculum[item]?.done || student.curriculum[item]?.signed
  ).length;
}

export function getSectionProgress(student: StudentRecord, sectionKey: keyof typeof skillSections) {
  const section = skillSections[sectionKey];

  if (sectionKey === "groupBehavior") {
    const totalFistBumps = section.items.reduce(
      (sum, item) => sum + (student.curriculum[item]?.fistBumps || 0),
      0
    );
    return Math.min(totalFistBumps, 50) * 2;
  }

  const completed = getCompletedCount(student, section.items);
  return Math.round((completed / section.items.length) * 100);
}

export function getOverallProgress(student: StudentRecord) {
  let total = 0;

  (Object.keys(skillSections) as Array<keyof typeof skillSections>).forEach((key) => {
    const sectionProgress = getSectionProgress(student, key);
    total += (sectionProgress / 100) * SECTION_WEIGHTS[key];
  });

  return Math.round(total);
}

export function getTotalFistBumps(student: StudentRecord) {
  return skillSections.groupBehavior.items.reduce(
    (sum, item) => sum + (student.curriculum[item]?.fistBumps || 0),
    0
  );
}

export function getEarnedBadges(student: StudentRecord) {
  const badges = new Set<string>();
  const totalProgress = getOverallProgress(student);
  const totalFistBumps = getTotalFistBumps(student);

  if (student.curriculum["Completed weekly lesson assignment"]?.signed) {
    badges.add("First Practice Week");
  }

  if (
    student.curriculum["Count quarter and eighth notes"]?.signed &&
    student.curriculum["Demonstrates rhythm exercise"]?.signed
  ) {
    badges.add("Rhythm Ready");
  }

  if (totalFistBumps >= 10) {
    badges.add("Great Bandmate");
  }

  if (
    student.curriculum["Performs part consistently"]?.signed &&
    student.curriculum["Stays with the band"]?.signed &&
    student.curriculum["Shows stage awareness"]?.signed
  ) {
    badges.add("Stage Ready");
  }

  if (totalProgress >= 100) {
    badges.add("Rock 101 Graduate");
  }

  return badges;
}

export function getStageLabel(progress: number) {
  if (progress < 25) return "Band Ready";
  if (progress < 60) return "Developing";
  if (progress < 100) return "Stage Ready";
  return "Performance Ready";
}