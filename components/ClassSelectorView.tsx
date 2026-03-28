"use client";

import { RockClass } from "@/types/class";
import { AppUser } from "@/types/user";
import { schools } from "@/data/schools";
import PageHero from "@/components/PageHero";

type ClassSelectorViewProps = {
  classes: RockClass[];
  users: AppUser[];
  weeklySessions?: any[];
  onSelectClass: (classId: string, sessionId?: string) => void;
};

export default function ClassSelectorView({
  classes,
  users,
  weeklySessions,
  onSelectClass,
}: ClassSelectorViewProps) {
  const instructorMap = Object.fromEntries(
    users
      .filter((user) => user.role === "instructor")
      .map((user) => [user.email, user.name])
  );

  const schoolMap = Object.fromEntries(
    schools.map((school) => [school.id, school.name])
  );
  console.log("CLASS SELECTOR weeklySessions:", weeklySessions);
  return (
    <div className="mt-8 space-y-6">
      <PageHero
        title="Rock 101 Classes"
        subtitle="Select a class to manage songs, students, rehearsals, and performance readiness."
        imageSrc="/images/rock101-drums.jpg"
      />
      {weeklySessions && weeklySessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white">This Week’s Sessions</h2>

          {weeklySessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => {
                console.log("SESSION BUTTON CLICKED", session);
                onSelectClass(session.rock_classes?.id, session.id);
              }}
              className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900/82 p-4 hover:border-red-500 hover:bg-zinc-800"
            >
              <div className="text-lg font-semibold text-white">
                {session.rock_classes?.name ?? "Unnamed Class"}
              </div>

              <div className="text-sm text-zinc-400 mt-1">
                {session.session_date} · {session.start_time || "Time not set"}
              </div>
              <div className="text-xs text-red-400">SESSION DEBUG ACTIVE</div>
              <div className="text-xs text-green-400">CLICK ME</div>
            </button>
          ))}
        </div>
      )}
      {classes.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/82 p-6 text-zinc-300 backdrop-blur-sm">
          No classes have been created yet. Build one in Class Setup first.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((rockClass) => {
            const instructorName =
              instructorMap[rockClass.instructorEmail] ||
              rockClass.instructorEmail ||
              "Not assigned";

            const schoolName =
              schoolMap[rockClass.schoolId] || rockClass.schoolId;

            return (
              <button
                key={rockClass.id}
                type="button"
                onClick={() => onSelectClass(rockClass.id)}
                className="rounded-xl border border-zinc-800 bg-zinc-900/82 p-5 text-left transition hover:border-red-500 hover:bg-zinc-800"
              >
                <div className="text-xl font-semibold text-white">
                  {rockClass.name}
                </div>

                <div className="mt-3 space-y-1 text-sm text-zinc-300">
                  <div>School: {schoolName}</div>
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
