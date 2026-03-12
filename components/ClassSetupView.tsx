"use client";

import { useState } from "react";
import { songLibrary } from "@/data/songLibrary";

type SetupStudent = {
  name: string;
  firstName: string;
  lastInitial: string;
  parentEmail: string;
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

type ClassSetupViewProps = {
  students: SetupStudent[];
  onAddStudent: (student: {
    firstName: string;
    lastInitial: string;
    parentEmail: string;
    instrument: string;
    band: string;
  }) => void;
};

type ClassInfo = {
  name: string;
  director: string;
  songs: string[];
};

const classTemplates: ClassInfo[] = [
  { name: "Tuesday 5pm Rock 101", director: "Director A", songs: [] },
  { name: "Wednesday 4pm Rock 101", director: "Director B", songs: [] },
  { name: "Thursday 5pm Rock 101", director: "Director C", songs: [] },
  { name: "Friday 4pm Rock 101", director: "Director D", songs: [] },
  { name: "Saturday 11am Rock 101", director: "Director E", songs: [] },
];

const instruments = ["Guitar", "Bass", "Keys", "Drums", "Voice"];

export default function ClassSetupView({
  students,
  onAddStudent,
}: ClassSetupViewProps) {
  const [classes, setClasses] = useState(classTemplates);

  const [form, setForm] = useState({
    firstName: "",
    lastInitial: "",
    parentEmail: "",
    instrument: "Guitar",
    band: classTemplates[0].name,
  });

  function toggleSong(className: string, song: string) {
    setClasses((prev) =>
      prev.map((c) => {
        if (c.name !== className) return c;

        const alreadySelected = c.songs.includes(song);

        if (alreadySelected) {
          return { ...c, songs: c.songs.filter((s) => s !== song) };
        }

        if (c.songs.length >= 5) return c;

        return { ...c, songs: [...c.songs, song] };
      })
    );
  }

  function submitStudent() {
    if (
      !form.firstName.trim() ||
      !form.lastInitial.trim() ||
      !form.parentEmail.trim()
    ) {
      return;
    }

    onAddStudent(form);

    setForm({
      firstName: "",
      lastInitial: "",
      parentEmail: "",
      instrument: "Guitar",
      band: classTemplates[0].name,
    });
  }

  return (
    <div className="mt-8 grid gap-8">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="mb-4 text-xl font-bold">Add Student</div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <input
            value={form.firstName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, firstName: e.target.value }))
            }
            placeholder="First Name"
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-white"
          />

          <input
            value={form.lastInitial}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, lastInitial: e.target.value }))
            }
            placeholder="Last Initial"
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-white"
          />

          <input
            value={form.parentEmail}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, parentEmail: e.target.value }))
            }
            placeholder="Parent Email"
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-white"
          />

          <select
            value={form.instrument}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, instrument: e.target.value }))
            }
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-white"
          >
            {instruments.map((instrument) => (
              <option key={instrument} value={instrument}>
                {instrument}
              </option>
            ))}
          </select>

          <select
            value={form.band}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, band: e.target.value }))
            }
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-white"
          >
            {classTemplates.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={submitStudent}
            className="rounded-lg bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-500"
          >
            Add Student
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {classes.map((c) => {
          const classStudents = students.filter((s) => s.band === c.name);

          return (
            <div
              key={c.name}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <div className="mb-2 text-xl font-bold">{c.name}</div>
              <div className="mb-4 text-sm text-zinc-400">
                Director: {c.director}
              </div>

              <div className="mb-5">
                <div className="mb-2 text-sm uppercase tracking-[0.2em] text-red-300">
                  Song Selection ({c.songs.length}/5)
                </div>

                <div className="flex flex-wrap gap-2">
                  {songLibrary.map((song) => {
                    const selected = c.songs.includes(song);

                    return (
                      <button
                        key={song}
                        type="button"
                        onClick={() => toggleSong(c.name, song)}
                        className={`rounded-lg px-3 py-2 text-sm ${
                          selected
                            ? "bg-red-600 text-white"
                            : "bg-zinc-800 text-white hover:bg-zinc-700"
                        }`}
                      >
                        {song}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm uppercase tracking-[0.2em] text-red-300">
                  Student Roster
                </div>

                <div className="grid gap-2">
                  {classStudents.map((student) => (
                    <div
                      key={student.name}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 p-3"
                    >
                      <div className="font-semibold">{student.name}</div>
                      <div className="text-sm text-zinc-400">
                        {student.instrument} · {student.parentEmail}
                      </div>
                    </div>
                  ))}

                  {classStudents.length === 0 && (
                    <div className="text-sm text-zinc-500">
                      No students assigned yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}