import { type CurriculumItem } from "@/lib/curriculumQueries";

type ProgressStudent = {
  instrument?: string;
  curriculum: Record<
    string,
    {
      done: boolean;
      signed: boolean;
      date: string | null;
      fistBumps: number;
    }
  >;
};

const FIST_BUMP_BADGES: Record<string, string> = {
  learnedSongs: "Learned Songs Star",
  practicedSongs: "Practice Champ",
  noNoodling: "No Noodling Pro",
  listenedToDirector: "Director Listener",
  respectedBandmates: "Great Bandmate",
};

const FIST_BUMP_ITEM_IDS = Object.keys(FIST_BUMP_BADGES);

function getCurriculumItemsForSection(
  curriculumItems: CurriculumItem[],
  sectionType: "privateLesson" | "groupRehearsal"
) {
  return curriculumItems.filter((item) => item.location === sectionType);
}

function isCompleted(
  student: ProgressStudent,
  itemId: string
) {
  return (
    student.curriculum[itemId]?.done === true ||
    student.curriculum[itemId]?.signed === true
  );
}

export function getCompletedCount(
  student: ProgressStudent,
  itemIds: readonly string[]
) {
  return itemIds.filter((itemId) => isCompleted(student, itemId)).length;
}

export function getPrivateLessonProgress(
  student: ProgressStudent,
  curriculumItems: CurriculumItem[]
) {
  const items = getCurriculumItemsForSection(curriculumItems, "privateLesson");
  if (items.length === 0) return 0;

  const completed = getCompletedCount(
    student,
    items.map((item) => item.id)
  );

  return Math.round((completed / items.length) * 100);
}

export function getGroupRehearsalProgress(
  student: ProgressStudent,
  curriculumItems: CurriculumItem[]
) {
  const items = getCurriculumItemsForSection(curriculumItems, "groupRehearsal");
  if (items.length === 0) return 0;

  const completed = getCompletedCount(
    student,
    items.map((item) => item.id)
  );

  return Math.round((completed / items.length) * 100);
}

export function getFistBumpProgress(student: ProgressStudent) {
  const totalFistBumps = getTotalFistBumps(student);
  const maxFistBumpsForProgress = FIST_BUMP_ITEM_IDS.length * 10;

  return Math.round(
    (Math.min(totalFistBumps, maxFistBumpsForProgress) / maxFistBumpsForProgress) * 100
  );
}

export function getOverallProgress(
  student: ProgressStudent,
  curriculumItems: CurriculumItem[]
) {
  const privateLessonProgress = getPrivateLessonProgress(student, curriculumItems);
  const groupRehearsalProgress = getGroupRehearsalProgress(student, curriculumItems);
  const fistBumpProgress = getFistBumpProgress(student);

  return Math.round(
    privateLessonProgress * 0.6 +
      groupRehearsalProgress * 0.3 +
      fistBumpProgress * 0.1
  );
}

export function getTotalFistBumps(student: ProgressStudent) {
  return FIST_BUMP_ITEM_IDS.reduce((sum, itemId) => {
    return sum + (student.curriculum[itemId]?.fistBumps || 0);
  }, 0);
}

export function getEarnedBadges(
  student: ProgressStudent,
  curriculumItems: CurriculumItem[]
) {
  const badges = new Set<string>();
  const totalProgress = getOverallProgress(student, curriculumItems);

  FIST_BUMP_ITEM_IDS.forEach((itemId) => {
    const fistBumps = student.curriculum[itemId]?.fistBumps || 0;

    if (fistBumps >= 10) {
      badges.add(FIST_BUMP_BADGES[itemId]);
    }
  });

  const requiredLessonItems = curriculumItems.filter((item) => item.area === "requiredLessons");
  const graduationItems = curriculumItems.filter((item) => item.area === "graduation");
  const rehearsalItems = curriculumItems.filter((item) => item.area === "rehearsalReadiness");

  if (
    requiredLessonItems.length > 0 &&
    requiredLessonItems.every((item) => student.curriculum[item.id]?.signed)
  ) {
    badges.add("Lesson Leader");
  }

  if (
    graduationItems.length > 0 &&
    graduationItems.every((item) => student.curriculum[item.id]?.signed)
  ) {
    badges.add("Graduation Skills Complete");
  }

  if (
    rehearsalItems.length > 0 &&
    rehearsalItems.every((item) => student.curriculum[item.id]?.signed)
  ) {
    badges.add("Rehearsal Ready");
  }

  if (
    curriculumItems.length > 0 &&
    curriculumItems.every(
      (item) => !item.required || student.curriculum[item.id]?.signed
    )
  ) {
    badges.add("Rock 101 Graduate");
  }

  if (totalProgress >= 100) {
    badges.add("Performance Ready");
  }

  return badges;
}

export function getStageLabel(progress: number) {
  if (progress < 25) return "Band Ready";
  if (progress < 60) return "Developing";
  if (progress < 100) return "Stage Ready";
  return "Performance Ready";
}

export function getSectionProgress(
  student: ProgressStudent,
  sectionKey:
    | "instrument"
    | "assignments"
    | "concepts"
    | "practicePerformance"
    | "groupBehavior",
  curriculumItems: CurriculumItem[]
) {
  if (sectionKey === "instrument" || sectionKey === "assignments") {
    return getPrivateLessonProgress(student, curriculumItems);
  }

  if (sectionKey === "concepts" || sectionKey === "practicePerformance") {
    return getGroupRehearsalProgress(student, curriculumItems);
  }

  if (sectionKey === "groupBehavior") {
    return getFistBumpProgress(student);
  }

  return 0;
}
