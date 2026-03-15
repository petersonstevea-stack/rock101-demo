"use client";

import { RockClass } from "@/types/class";
import { AppUser } from "@/types/user";
import { schools } from "@/data/schools";
import PageHero from "@/components/PageHero";

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
  allStudents: Student[];
  onBackToClasses: () => void;
  onSelectStudent: (studentName: string) => void;
  onAddStudentToClass: (studentId: string) => void;
  onRemoveStudentFromClass: (studentId: string) => void;
};

export default function ClassDetailView({
  rockClass,
  students,
  users,
  allStudents,
  onBackToClasses,
  onSelectStudent,
  onAddStudentToClass,
  onRemoveStudentFromClass,
}: ClassDetailViewProps) {
  const instructorName =
    users.find((user) => user.email === rockClass.instructorEmail)?.name ||
    rockClass.instructorEmail ||
    "Not assigned";

  const directorName =
    users.find((user) => user.email === rockClass.directorEmail)?.name ||
    rockClass.directorEmail ||
    "Not assigned";

  const schoolName =
    schools.find((school) => school.id === rockClass.schoolId)?.name ||
    rockClass.schoolId;

  const availableStudents = allStudents.filter(
    (student) =>
      student.schoolId === rockClass.schoolId &&
      student.id &&
      !rockClass.studentIds.includes(student.id)
  );

  return (
    <div className="mt-8 space-y-6">
      <PageHero
        title={rockClass.name}
        subtitle={`${schoolName} • ${rockClass.dayOfWeek} • ${
          rockClass.time || "Time not set"
        }`}
        imageSrc="/images/rock101-drums.jpg"
      />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToClasses}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
        >
          Back to Classes
        </button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/82 p-6 backdrop-blur-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-lg border border-zinc-800 bg-black/35 p-4 backdrop-blur-sm">
            <div className="text-sm text-zinc-400">School</div>
            <div className="mt-2 font-semibold text-white">{schoolName}</div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black/35 p-4 backdrop-blur-sm">
            <div className="text-sm text-zinc-400">Schedule</div>
            <div className="mt-2 font-semibold text-white">
              {rockClass.dayOfWeek} · {rockClass.time || "Time not set"}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black/35 p-4 backdrop-blur-sm">
            <div className="text-sm text-zinc-400">Director</div>
            <div className="mt-2 font-semibold text-white">{directorName}</div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black/35 p-4 backdrop-blur-sm">
            <div className="text-sm text-zinc-400">Instructor</div>
            <div className="mt-2 font-semibold text-white">{instructorName}</div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black/35 p-4 backdrop-blur-sm">
            <div className="text-sm text-zinc-400">Performance</div>
            <div className="mt-2 font-semibold text-white">
              {rockClass.performanceTitle || "Not set"}
            </div>
            <div className="text-sm text-zinc-400">
              {rockClass.performanceDate || "No date"}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black/35 p-4 backdrop-blur-sm">
            <div className="text-sm text-zinc-400">Students</div>
            <div className="mt-2 text-2xl font-bold text-white">
              {rockClass.studentNames.length}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/82 p-6 backdrop-blur-sm">
        <h3 className="text-xl font-semibold text-white">Approved Songs</h3>
        <div className="mt-4 text-zinc-200">
          {rockClass.songs.length > 0
            ? rockClass.songs.join(", ")
            : "No songs assigned"}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/82 p-6 backdrop-blur-sm">
        <h3 className="text-xl font-semibold text-white">Student Roster</h3>

        <div className="mt-4 mb-6">
          <div className="mb-2 text-sm text-zinc-400">Add Student to Class</div>

          {availableStudents.length === 0 ? (
            <div className="text-sm text-zinc-500">
              No additional students available for this school.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => onAddStudentToClass(student.id!)}
                  className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700"
                >
                  + {student.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {students.length === 0 ? (
          <p className="mt-4 text-zinc-300">No students assigned to this class.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {students.map((student) => (
              <div
                key={student.id ?? student.name}
                className="rounded-lg border border-zinc-800 bg-black/35 p-4 backdrop-blur-sm"
              >
                <div className="text-lg font-semibold text-white">
                  {student.name}
                </div>

                <div className="mt-2 text-sm text-zinc-300">
                  Instrument: {student.instrument || "Not set"}
                </div>

                <div className="mt-1 text-sm text-zinc-400">
                  Band: {student.band || "Not set"}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectStudent(student.name)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-500"
                  >
                    Open Progress
                  </button>

                  {student.id ? (
                    <button
                      type="button"
                      onClick={() => onRemoveStudentFromClass(student.id!)}
                      className="rounded-lg bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}