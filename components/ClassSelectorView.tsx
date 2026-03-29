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

export default function ClassSelectorView({
  classes,
  users,
  weeklySessions,
  onSelectClass,
}: ClassSelectorViewProps) {
  return (
    <div className="mt-8 space-y-6">
      <PageHero
        title="Rock 101 Classes"
        subtitle="Select a session to manage songs, students, rehearsals, and performance readiness."
        imageSrc="/images/rock101-drums.jpg"
      />

      {weeklySessions && weeklySessions.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-white">This Week’s Sessions</h2>

          {weeklySessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelectClass(session.rock_classes?.id, session.id)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/82 p-4 text-left transition hover:border-red-500 hover:bg-zinc-800"
            >
              <div className="text-lg font-semibold text-white">
                {session.rock_classes?.name ?? "Unnamed Class"}
              </div>

              <div className="mt-1 text-sm text-zinc-400">
                {session.session_date} · {session.start_time || "Time not set"}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/82 p-6 text-zinc-300 backdrop-blur-sm">
          No sessions scheduled for this week.
        </div>
      )}
    </div>
  );
}