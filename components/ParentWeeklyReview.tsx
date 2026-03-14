"use client";

import { useEffect, useMemo, useState } from "react";

import type { CurriculumItem } from "@/data/rock101Curriculum";
import {
  getPrivateLessonSections,
  getGroupRehearsalSections,
} from "@/data/rock101Curriculum";
import {
  getStudentLessonProgress,
  type StudentLessonProgressMap,
} from "@/data/studentProgress";
import { getTotalFistBumps } from "@/lib/progress";
import PageHero from "@/components/PageHero";

type ParentStudent = {
  id?: string;
  name: string;
  instrument: string;
  band: string;
  curriculum: Record<
    string,
    {
      done: boolean;
      signed: boolean;
      date: string | null;
      fistBumps: number;
    }
  >;
  notes: {
    instructor: string;
    director: string;
  };
  workflow: {
    instructorSubmitted: boolean;
    directorSubmitted: boolean;
    parentSubmitted: boolean;
  };
};

type ParentWeeklyReviewProps = {
  student: ParentStudent;
};

type ProgressRow = {
  key: string;
  title: string;
  progress: number;
};

function percent(completed: number, total: number) {
  if (!total) return 0;
  return Math.round((completed / total) * 100);
}

function isCurriculumItemComplete(
  student: ParentStudent,
  item: CurriculumItem
): boolean {
  const value = student.curriculum[item.id];
  return !!(value?.done || value?.signed);
}

function countCompletedCurriculumItems(
  student: ParentStudent,
  items: CurriculumItem[]
) {
  return items.filter((item) => isCurriculumItemComplete(student, item)).length;
}

function countCompletedRequiredLessons(
  items: CurriculumItem[],
  lessonProgress: StudentLessonProgressMap
) {
  return items.filter((item) => !!lessonProgress[item.id]).length;
}

function buildRockSummary(
  student: ParentStudent,
  overallProgress: number,
  completedCount: number,
  signedCount: number
) {
  const instructorNote =
    student.notes.instructor?.trim() || "No instructor notes yet.";
  const directorNote =
    student.notes.director?.trim() || "No director notes yet.";

  if (overallProgress < 20) {
    return `${student.name} is just getting rolling in Rock 101 and is currently at ${overallProgress}% completion. That is completely normal at this stage. Right now the focus is on getting comfortable, building confidence, and learning how to play with the band from day one. So far ${student.name.toLowerCase()} has completed ${completedCount} total checklist items, with ${signedCount} officially signed off in private lessons and rehearsal. In lessons and rehearsal, the goal is to keep showing up, stacking reps, and starting to build the foundation that will make everything click later on. Instructor note: ${instructorNote} Director note: ${directorNote}`;
  }

  if (overallProgress < 60) {
    return `${student.name} is starting to find a real groove in Rock 101 and is currently at ${overallProgress}% completion. You can see the reps beginning to add up in timing, consistency, and overall comfort playing with the band. So far ${student.name.toLowerCase()} has completed ${completedCount} total checklist items, with ${signedCount} officially signed off in private lessons and rehearsal. The next step is taking those early wins and turning them into habits that feel natural in both lessons and rehearsal. Instructor note: ${instructorNote} Director note: ${directorNote}`;
  }

  if (overallProgress < 90) {
    return `${student.name} is really starting to lock things in and is now at ${overallProgress}% completion in Rock 101. At this point students usually begin to sound more confident with the band, recover from mistakes faster, and play their parts with more consistency. ${student.name} has completed ${completedCount} total checklist items, with ${signedCount} officially signed off in private lessons and rehearsal. The mission now is to keep tightening everything up so those developing chops feel reliable on stage. Instructor note: ${instructorNote} Director note: ${directorNote}`;
  }

  return `${student.name} is in the home stretch at ${overallProgress}% completion and is getting seriously close to the Performance Program. The confidence, awareness, and band skills are all starting to come together. ${student.name} has completed ${completedCount} total checklist items, with ${signedCount} officially signed off in private lessons and rehearsal. A few more strong reps and we’ll be looking at a student who is ready to step up and own the stage. Instructor note: ${instructorNote} Director note: ${directorNote}`;
}

export default function ParentWeeklyReview({
  student,
}: ParentWeeklyReviewProps) {
  const [lessonProgress, setLessonProgress] = useState<StudentLessonProgressMap>(
    {}
  );

  const studentProgressId =
    student.id ?? `${student.name}-${student.instrument}-${student.band}`;

  useEffect(() => {
    let isMounted = true;

    async function loadProgress() {
      const stored = await getStudentLessonProgress(studentProgressId);
      if (isMounted) {
        setLessonProgress(stored.lessons ?? {});
      }
    }

    loadProgress();

    return () => {
      isMounted = false;
    };
  }, [studentProgressId]);

  const privateSections = useMemo(
    () => getPrivateLessonSections(student.instrument),
    [student.instrument]
  );

  const groupSections = useMemo(
    () => getGroupRehearsalSections(student.instrument),
    [student.instrument]
  );

  const graduationItems = useMemo(
    () =>
      privateSections
        .filter((section) => section.area === "graduation")
        .flatMap((section) => section.items),
    [privateSections]
  );

  const requiredLessonItems = useMemo(
    () =>
      privateSections
        .filter((section) => section.area === "requiredLessons")
        .flatMap((section) => section.items),
    [privateSections]
  );

  const rehearsalItems = useMemo(
    () => groupSections.flatMap((section) => section.items),
    [groupSections]
  );

  const graduationCompleted = useMemo(
    () => countCompletedCurriculumItems(student, graduationItems),
    [student, graduationItems]
  );

  const requiredLessonsCompleted = useMemo(
    () => countCompletedRequiredLessons(requiredLessonItems, lessonProgress),
    [requiredLessonItems, lessonProgress]
  );

  const rehearsalCompleted = useMemo(
    () => countCompletedCurriculumItems(student, rehearsalItems),
    [student, rehearsalItems]
  );

  const graduationProgress = percent(
    graduationCompleted,
    graduationItems.length
  );
  const requiredLessonsProgress = percent(
    requiredLessonsCompleted,
    requiredLessonItems.length
  );
  const rehearsalProgress = percent(rehearsalCompleted, rehearsalItems.length);

  const overallCompleted =
    graduationCompleted + requiredLessonsCompleted + rehearsalCompleted;
  const overallTotal =
    graduationItems.length + requiredLessonItems.length + rehearsalItems.length;
  const overallProgress = percent(overallCompleted, overallTotal);

  const signedCount = Object.values(student.curriculum).filter(
    (item) => item.signed
  ).length;

  const totalFistBumps = getTotalFistBumps(student);

  const summary = buildRockSummary(
    student,
    overallProgress,
    overallCompleted,
    signedCount
  );

  const sectionRows: ProgressRow[] = [
    {
      key: "graduation",
      title: "Private Lessons: Graduation Requirements",
      progress: graduationProgress,
    },
    {
      key: "requiredLessons",
      title: "Private Lessons: Method App Required Lessons",
      progress: requiredLessonsProgress,
    },
    {
      key: "rehearsalReadiness",
      title: "Group Rehearsal: Rehearsal Readiness",
      progress: rehearsalProgress,
    },
  ];

  return (
    <div className="mt-8">
      <PageHero
        title="Parent Weekly Review"
        subtitle="Track lesson progress, rehearsal readiness, and instructor feedback."
        imageSrc="/images/rock101-band.jpg"
      />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/82 p-6 backdrop-blur-sm">
        <div className="mb-4 text-sm uppercase tracking-[0.2em] text-red-300">
          Parent Weekly Review
        </div>

        <div className="grid gap-6">
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/35 p-4 backdrop-blur-sm">
            <div>
              <div className="text-sm text-zinc-400">Overall Progress</div>
              <div className="mt-1 text-2xl font-bold text-white">
                {overallProgress}%
              </div>
            </div>

            <div className="text-sm text-red-300">
              Next Show: May 18 • Rock 101 Showcase
            </div>
          </div>

          <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4 backdrop-blur-sm">
            <div className="mb-3 text-sm uppercase tracking-[0.2em] text-red-300">
              Weekly Progress Email Preview
            </div>

            <div className="grid gap-5 lg:grid-cols-[0.95fr,1.05fr]">
              <div className="grid gap-4">
                <div className="rounded-xl border border-zinc-800 bg-black/35 p-4 backdrop-blur-sm">
                  <div className="mb-2 flex items-center justify-between text-sm text-white">
                    <span>Overall Progress</span>
                    <span>{overallProgress}%</span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-red-600"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black/35 p-4 backdrop-blur-sm">
                  <div className="mb-3 font-semibold text-white">
                    Curriculum Progress
                  </div>

                  <div className="grid gap-3">
                    {sectionRows.map((row) => (
                      <div key={row.key} className="grid gap-2">
                        <div className="flex items-center justify-between text-sm text-white">
                          <span>{row.title}</span>
                          <span>{row.progress}%</span>
                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full bg-red-600"
                            style={{ width: `${row.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-xl border border-zinc-800 bg-black/35 p-4 text-sm leading-7 text-white/95 backdrop-blur-sm">
                  {summary}
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black/35 p-4 backdrop-blur-sm">
                  <div className="mb-2 font-semibold text-white">
                    Instructor Notes
                  </div>
                  <div className="text-sm leading-6 text-zinc-200">
                    {student.notes.instructor || "No instructor notes yet."}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black/35 p-4 backdrop-blur-sm">
                  <div className="mb-2 font-semibold text-white">
                    Rock 101 Director Notes
                  </div>
                  <div className="text-sm leading-6 text-zinc-200">
                    {student.notes.director || "No director notes yet."}
                  </div>
                  <div className="mt-3 text-sm text-red-300">
                    Weekly shout-outs: {totalFistBumps}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
