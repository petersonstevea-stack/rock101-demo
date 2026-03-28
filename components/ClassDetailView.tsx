"use client";

import { useState } from "react";
import { RockClass } from "@/types/class";
import { AppUser } from "@/types/user";
import { schools } from "@/data/schools";
import PageHero from "@/components/PageHero";
import {
  SONG_READINESS_LEVELS,
  type SongReadinessValue,
} from "@/types/songReadiness";

type Student = {
  id?: string;
  name: string;
  instrument?: string;
  band?: string;
  schoolId?: string;
};

type ClassDetailViewProps = {
  rockClass: RockClass;
  selectedSessionId?: string | null;  // ← add this line
  selectedSession?: any | null;
  students: Student[];
  users: AppUser[];
  allStudents: Student[];
  onBackToClasses: () => void;
  onDeleteClass: () => void;
  onEditClass: () => void;
  onSelectStudent: (studentName: string) => void;
  onAddStudentToClass: (studentId: string) => void;
  onRemoveStudentFromClass: (studentId: string) => void;
  onUpdateSongProgress: (song: string, readiness: SongReadinessValue) => void;
  directorFeedback: string;
  onDirectorFeedbackChange: (value: string) => void;
  onSaveDirectorFeedback: () => void;
};

function getSongReadinessLabel(readiness?: number) {
  if (!readiness || readiness < 1 || readiness > SONG_READINESS_LEVELS.length) {
    return SONG_READINESS_LEVELS[0];
  }

  return SONG_READINESS_LEVELS[readiness - 1];
}

export default function ClassDetailView({
  rockClass,
  selectedSessionId,
  selectedSession,
  students,
  users,
  allStudents,
  onBackToClasses,
  onDeleteClass,
  onEditClass,
  onSelectStudent,
  onAddStudentToClass,
  onRemoveStudentFromClass,
  onUpdateSongProgress,
  directorFeedback,
  onDirectorFeedbackChange,
  onSaveDirectorFeedback,
}: ClassDetailViewProps) {
  const [feedbackSaved, setFeedbackSaved] = useState(false);
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
        subtitle={`${schoolName} • ${rockClass.dayOfWeek} • ${rockClass.time || "Time not set"
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

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEditClass}
            className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-500"
          >
            Edit Class
          </button>

          <button
            type="button"
            onClick={onDeleteClass}
            className="rounded-lg bg-red-800 px-4 py-2 text-white hover:bg-red-700"
          >
            Delete Class
          </button>
        </div>
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
        {selectedSessionId && (
          <div className="mb-4 rounded-lg bg-red-600 p-3 text-white font-bold">
            🚨 SESSION ACTIVE:{" "}
            {selectedSession?.session_date && selectedSession?.start_time
              ? `${selectedSession.session_date} · ${selectedSession.start_time}`
              : selectedSessionId}
          </div>
        )}

        <h3 className="text-xl font-semibold text-white">Approved Songs</h3>

        {rockClass.songs.length > 0 ? (
          <div className="mt-4 space-y-4">
            {rockClass.songs.map((song) => {
              const readiness =
                rockClass.songProgress?.[song]?.readiness ?? 1;

              return (
                <div
                  key={song}
                  className="rounded-xl border border-zinc-800 bg-black/35 p-4 backdrop-blur-sm"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold text-white">{song}</div>
                      <div className="mt-1 text-sm text-zinc-400">
                        Class readiness: {getSongReadinessLabel(readiness)}
                      </div>
                    </div>

                    <div className="w-full md:max-w-md">
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={readiness}
                        onChange={(e) =>
                          onUpdateSongProgress(
                            song,
                            Number(e.target.value) as SongReadinessValue
                          )
                        }
                        className="w-full accent-red-600"
                      />
                      <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                        <span>Just Starting</span>
                        <span>Show Ready</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 text-zinc-200">No songs assigned</div>
        )}
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/82 p-6 backdrop-blur-sm">
        <h3 className="text-xl font-semibold text-white">Director Weekly Feedback</h3>

        <div className="mt-4">
          <textarea
            value={directorFeedback}
            onChange={(e) => onDirectorFeedbackChange(e.target.value)}
            placeholder="Add weekly class-level feedback here..."
            className="min-h-[140px] w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white placeholder:text-zinc-500"
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              onSaveDirectorFeedback();
              setFeedbackSaved(true);

              setTimeout(() => {
                setFeedbackSaved(false);
              }, 2000);
            }}
            className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-500"
          >
            Save Director Feedback
          </button>

          {feedbackSaved && (
            <span className="text-sm text-green-400">
              Saved ✓
            </span>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/82 p-6 backdrop-blur-sm">
        <h3 className="text-xl font-semibold text-white">Student Roster</h3>

        <div className="mb-6 mt-4">
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