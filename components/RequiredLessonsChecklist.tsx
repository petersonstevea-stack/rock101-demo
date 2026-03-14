"use client";

import { useEffect, useMemo, useState } from "react";

import type { Instrument, CurriculumItem } from "@/data/rock101Curriculum";
import { getGroupedRequiredLessonSections } from "@/data/rock101Curriculum";
import {
  getStudentLessonProgress,
  setStudentLessonCompleted,
  type StudentLessonProgressMap,
} from "@/data/studentProgress";

type RequiredLessonsChecklistProps = {
  studentId: string;
  instrument: Instrument;
  title?: string;
};

function getSourceText(item: CurriculumItem) {
  const parts = item.description?.split(" • ");
  return parts && parts.length > 1 ? parts.slice(1).join(" • ") : "";
}

export default function RequiredLessonsChecklist({
  studentId,
  instrument,
  title = "Required Lessons",
}: RequiredLessonsChecklistProps) {
  const [progress, setProgress] = useState<StudentLessonProgressMap>({});

  useEffect(() => {
    const stored = getStudentLessonProgress(studentId);
    setProgress(stored.lessons);
  }, [studentId]);

  const groupedSections = useMemo(
    () => getGroupedRequiredLessonSections(instrument),
    [instrument]
  );

  const totalLessons = useMemo(
    () => groupedSections.reduce((sum, group) => sum + group.items.length, 0),
    [groupedSections]
  );

  const completedLessons = useMemo(
    () =>
      groupedSections.reduce(
        (sum, group) =>
          sum + group.items.filter((item) => !!progress[item.id]).length,
        0
      ),
    [groupedSections, progress]
  );

  function handleToggle(lessonId: string, checked: boolean) {
    const next = setStudentLessonCompleted(studentId, lessonId, checked);
    setProgress(next);
  }

  return (
    <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-sm text-zinc-300">
          {completedLessons} of {totalLessons} lessons completed
        </p>
      </div>

      <div className="space-y-6">
        {groupedSections.map((group) => (
          <section key={group.id} className="space-y-3">
            <div className="border-b border-zinc-700 pb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-red-500">
                {group.title}
              </h3>
              <p className="mt-1 text-xs text-zinc-400">
                {group.items.filter((item) => !!progress[item.id]).length} /{" "}
                {group.items.length} completed
              </p>
            </div>

            <div className="space-y-2">
              {group.items.map((item) => {
                const checked = !!progress[item.id];
                const sourceText = getSourceText(item);

                return (
                  <label
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-3 hover:bg-zinc-800"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        handleToggle(item.id, e.currentTarget.checked)
                      }
                      className="mt-1 h-4 w-4 accent-red-600"
                    />

                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-sm font-medium ${
                          checked ? "text-zinc-500 line-through" : "text-white"
                        }`}
                      >
                        {item.label}
                      </div>

                      {sourceText ? (
                        <div className="mt-1 text-xs text-zinc-400">
                          {sourceText}
                        </div>
                      ) : null}
                    </div>
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}