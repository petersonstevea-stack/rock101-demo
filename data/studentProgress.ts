export type StudentLessonProgressMap = Record<string, boolean>;

export type StudentLessonProgressRecord = {
  studentId: string;
  lessons: StudentLessonProgressMap;
  updatedAt: string;
};

const STORAGE_PREFIX = "rock101-progress";

function getStorageKey(studentId: string) {
  return `${STORAGE_PREFIX}:${studentId}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getStudentLessonProgress(
  studentId: string
): StudentLessonProgressRecord {
  if (!canUseStorage()) {
    return {
      studentId,
      lessons: {},
      updatedAt: new Date().toISOString(),
    };
  }

  const raw = localStorage.getItem(getStorageKey(studentId));

  if (!raw) {
    return {
      studentId,
      lessons: {},
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const parsed = JSON.parse(raw) as StudentLessonProgressRecord;

    return {
      studentId,
      lessons: parsed.lessons ?? {},
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return {
      studentId,
      lessons: {},
      updatedAt: new Date().toISOString(),
    };
  }
}

export function saveStudentLessonProgress(
  studentId: string,
  lessons: StudentLessonProgressMap
) {
  if (!canUseStorage()) return;

  const payload: StudentLessonProgressRecord = {
    studentId,
    lessons,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(getStorageKey(studentId), JSON.stringify(payload));
}

export function setStudentLessonCompleted(
  studentId: string,
  lessonId: string,
  completed: boolean
) {
  const current = getStudentLessonProgress(studentId);

  const nextLessons: StudentLessonProgressMap = {
    ...current.lessons,
    [lessonId]: completed,
  };

  saveStudentLessonProgress(studentId, nextLessons);

  return nextLessons;
}

export function toggleStudentLessonCompleted(
  studentId: string,
  lessonId: string
) {
  const current = getStudentLessonProgress(studentId);
  const currentValue = !!current.lessons[lessonId];

  const nextLessons: StudentLessonProgressMap = {
    ...current.lessons,
    [lessonId]: !currentValue,
  };

  saveStudentLessonProgress(studentId, nextLessons);

  return nextLessons;
}

export function isLessonCompleted(
  studentId: string,
  lessonId: string
): boolean {
  const current = getStudentLessonProgress(studentId);
  return !!current.lessons[lessonId];
}

export function clearStudentLessonProgress(studentId: string) {
  if (!canUseStorage()) return;
  localStorage.removeItem(getStorageKey(studentId));
}

export function getCompletedLessonCount(studentId: string) {
  const current = getStudentLessonProgress(studentId);
  return Object.values(current.lessons).filter(Boolean).length;
}