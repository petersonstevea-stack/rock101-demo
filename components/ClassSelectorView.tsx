"use client";

import { RockClass } from "@/types/class";
import { AppUser } from "@/types/user";
import PageHero from "@/components/PageHero";

type ClassSelectorViewProps = {
  classes: RockClass[];
  users: AppUser[];
  weeklySessions?: any[];
  onSelectClass: (classId: string, sessionId?: string) => void;
};

function formatSessionTime(time?: string | null) {
  if (!time) return "Time not set";

  const [hours, minutes] = time.split(":");
  const hourNum = Number(hours);
  const minuteNum = Number(minutes ?? "0");

  if (Number.isNaN(hourNum) || Number.isNaN(minuteNum)) return time;

  const suffix = hourNum >= 12 ? "PM" : "AM";
  const hour12 = hourNum % 12 || 12;
  const paddedMinutes = String(minuteNum).padStart(2, "0");

  return `${hour12}:${paddedMinutes} ${suffix}`;
}

function formatSessionDate(dateStr?: string | null) {
  if (!dateStr) return "Date not set";

  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;

  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

export default function ClassSelectorView({
  classes,
  users,
  weeklySessions,
  onSelectClass,
}: ClassSelectorViewProps) {
  const instructorMap = Object.fromEntries(
    users.map((user) => [user.email, user.name])
  );

  const classMap = Object.fromEntries(
    classes.map((rockClass) => [rockClass.id, rockClass])
  );

  return (
    <div className="mt-8 space-y-6">
      <PageHero
        title="Rock 101 Classes"
        subtitle="Select a session to manage songs, students, rehearsals, and performance readiness."
        imageSrc="/images/rock101-drums.jpg"
      />

      {weeklySessions && weeklySessions.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">This Week’s Sessions</h2>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {weeklySessions.map((session) => {
              const rockClass = classMap[session.rock_classes?.id];
              const directorName =
                rockClass?.directorEmail
                  ? instructorMap[rockClass.directorEmail] ||
                  rockClass.directorEmail
                  : "Not assigned";

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() =>
                    onSelectClass(session.rock_classes?.id, session.id)
                  }
                  className="rounded-none border border-zinc-800 bg-zinc-900 p-4 text-left transition hover:border-[#cc0000] hover:bg-zinc-800"
                >
                  <div className="text-xl font-semibold text-white">
                    {session.rock_classes?.name ?? "Unnamed Class"}
                  </div>

                  <div className="mt-2 text-sm text-zinc-300">
                    Class Instructor: {directorName}
                  </div>

                  <div className="mt-2 space-y-1 text-sm text-zinc-400">
                    <div>
                      {formatSessionDate(session.session_date)} ·{" "}
                      {formatSessionTime(session.start_time)}
                    </div>
                    <div>
                      Show Date:{" "}
                      {rockClass?.performanceDate
                        ? formatSessionDate(rockClass.performanceDate)
                        : "Not set"}
                    </div>
                    <div>
                      Students: {rockClass?.studentNames?.length ?? 0}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/82 p-6 text-zinc-300 backdrop-blur-sm">
          No sessions scheduled for this week.
        </div>
      )}
    </div>
  );
}