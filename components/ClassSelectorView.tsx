"use client";

import { RockClass } from "@/types/class";
import { AppUser } from "@/types/user";

type ClassSelectorViewProps = {
  classes: RockClass[];
  users: AppUser[];
  onSelectClass: (classId: string) => void;
};

export default function ClassSelectorView({
  classes,
  users,
  onSelectClass,
}: ClassSelectorViewProps) {
  const instructorMap = Object.fromEntries(
    users
      .filter((user) => user.role === "instructor")
      .map((user) => [user.email, user.name])
  );

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">Select a Rock 101 Class</h2>
        <p className="mt-2 text-zinc-400">
          Choose a class to view songs, performance info, and student roster.
        </p>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">
          No classes have been created yet. Build one in Class Setup first.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((rockClass) => {
            const instructorName =
              instructorMap[rockClass.instructorEmail] ||
              rockClass.instructorEmail ||
              "Not assigned";

            return (
              <button
                key={rockClass.id}
                type="button"
                onClick={() => onSelectClass(rockClass.id)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-left transition hover:border-red-500 hover:bg-zinc-800"
              >
                <div className="text-xl font-semibold">{rockClass.name}</div>

                <div className="mt-3 space-y-1 text-sm text-zinc-400">
                  <div>
                    {rockClass.dayOfWeek} · {rockClass.time || "Time not set"}
                  </div>
                  <div>Instructor: {instructorName}</div>
                  <div>
                    Performance: {rockClass.performanceTitle || "Not set"}
                    {rockClass.performanceDate
                      ? ` · ${rockClass.performanceDate}`
                      : ""}
                  </div>
                  <div>{rockClass.studentNames.length} students</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}