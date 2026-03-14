import {
  getAllCurriculumItems,
  getGroupRehearsalSections,
  getPrivateLessonSections,
} from "@/data/rock101Curriculum";

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

function getNormalizedInstrument(student: ProgressStudent) {
  return student.instrument?.toLowerCase() ?? "guitar";
}

function getCurriculumItemsForSection(student: ProgressStudent, sectionType: "privateLesson" | "groupRehearsal") {
  const instrument = getNormalizedInstrument(student);

  if (sectionType === "privateLesson") {
    return getPrivateLessonSections(instrument).flatMap((section) => section.items);
  }

  return getGroupRehearsalSections(instrument).flatMap((section) => section.items);
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

export function getPrivateLessonProgress(student: ProgressStudent) {
  const items = getCurriculumItemsForSection(student, "privateLesson");
  if (items.length === 0) return 0;

  const completed = getCompletedCount(
    student,
    items.map((item) => item.id)
  );

  return Math.round((completed / items.length) * 100);
}

export function getGroupRehearsalProgress(student: ProgressStudent) {
  const items = getCurriculumItemsForSection(student, "groupRehearsal");
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

export function getOverallProgress(student: ProgressStudent) {
  const privateLessonProgress = getPrivateLessonProgress(student);
  const groupRehearsalProgress = getGroupRehearsalProgress(student);
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

export function getEarnedBadges(student: ProgressStudent) {
  const badges = new Set<string>();
  const instrument = getNormalizedInstrument(student);
  const allCurriculumItems = getAllCurriculumItems(instrument);
  const totalProgress = getOverallProgress(student);

  FIST_BUMP_ITEM_IDS.forEach((itemId) => {
    const fistBumps = student.curriculum[itemId]?.fistBumps || 0;

    if (fistBumps >= 10) {
      badges.add(FIST_BUMP_BADGES[itemId]);
    }
  });

  const privateLessonItems = getPrivateLessonSections(instrument).flatMap(
    (section) => section.items
  );
  const requiredLessonItems = privateLessonItems.filter(
    (item) => item.area === "requiredLessons"
  );
  const graduationItems = privateLessonItems.filter(
    (item) => item.area === "graduation"
  );
  const rehearsalItems = getGroupRehearsalSections(instrument).flatMap(
    (section) => section.items
  );

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
    allCurriculumItems.length > 0 &&
    allCurriculumItems.every(
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
    | "groupBehavior"
) {
  if (sectionKey === "instrument" || sectionKey === "assignments") {
    return getPrivateLessonProgress(student);
  }

  if (sectionKey === "concepts" || sectionKey === "practicePerformance") {
    return getGroupRehearsalProgress(student);
  }

  if (sectionKey === "groupBehavior") {
    return getFistBumpProgress(student);
  }

  return 0;
}