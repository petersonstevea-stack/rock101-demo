"use client";

import { RockClass } from "@/types/class";
import { AppUser } from "@/types/user";
import { schools } from "@/data/schools";

type Student = {
  id?: string;
  name: string;
  instrument?: string;
  band?: string;
  schoolId?: string;
};

type ClassDetailViewProps = {
  rockClass: RockClass;
  students: Student[];
  users: AppUser[];
  onBackToClasses: () => void;
  onSelectStudent: (studentName: string) => void;
};

export default function ClassDetailView({
  rockClass,
  students,
  users,
  onBackToClasses,
  onSelectStudent,
}: ClassDetailViewProps) {
  const instructorName =
    users.find((user) => user.email === rockClass.instructorEmail)?.name ||
    rockClass.instructorEmail ||
    "Not assigned";

  const schoolName =
    schools.find((school) => school.id === rockClass.schoolId)?.name ||
    rockClass.schoolId;

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToClasses}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
        >
          Back to Classes
        </button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">{rockClass.name}</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-zinc-800 bg-black p-4">
            <div className="text-sm text-zinc-400">School</div>
            <div className="mt-2 font-semibold">{schoolName}</div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black p-4">
            <div className="text-sm text-zinc-400">Schedule</div>
            <div className="mt-2 font-semibold">
              {rockClass.dayOfWeek} · {rockClass.time || "Time not set"}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black p-4">
            <div className="text-sm text-zinc-400">Instructor</div>
            <div className="mt-2 font-semibold">{instructorName}</div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black p-4">
            <div className="text-sm text-zinc-400">Performance</div>
            <div className="mt-2 font-semibold">
              {rockClass.performanceTitle || "Not set"}
            </div>
            <div className="text-sm text-zinc-400">
              {rockClass.performanceDate || "No date"}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black p-4">
            <div className="text-sm text-zinc-400">Students</div>
            <div className="mt-2 text-2xl font-bold">
              {rockClass.studentNames.length}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-xl font-semibold">Approved Songs</h3>
        <div className="mt-4 text-zinc-300">
          {rockClass.songs.length > 0
            ? rockClass.songs.join(", ")
            : "No songs assigned"}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-xl font-semibold">Student Roster</h3>

        {students.length === 0 ? (
          <p className="mt-4 text-zinc-400">No students assigned to this class.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {students.map((student) => (
              <div
                key={student.id ?? student.name}
                className="rounded-lg border border-zinc-800 bg-black p-4"
              >
                <div className="text-lg font-semibold">{student.name}</div>

                <div className="mt-2 text-sm text-zinc-400">
                  Instrument: {student.instrument || "Not set"}
                </div>

                <div className="mt-1 text-sm text-zinc-400">
                  Band: {student.band || "Not set"}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectStudent(student.name)}
                  className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-500"
                >
                  Open Progress
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}