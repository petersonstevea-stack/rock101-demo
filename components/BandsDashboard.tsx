"use client";

import { useState, useEffect } from "react";
import { fetchAllCurriculumItems, type CurriculumItem } from "@/lib/curriculumQueries";
import { getOverallProgress } from "@/lib/progress";

type DashboardStudent = {
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

type BandsDashboardProps = {
  students: DashboardStudent[];
};

export default function BandsDashboard({ students }: BandsDashboardProps) {
  const [curriculumByInstrument, setCurriculumByInstrument] = useState<Record<string, CurriculumItem[]>>({});

  useEffect(() => {
    const instruments = Array.from(new Set(students.map((s) => s.instrument.toLowerCase())));
    Promise.all(
      instruments.map(async (instrument) => {
        const items = await fetchAllCurriculumItems(instrument);
        return [instrument, items] as const;
      })
    ).then((entries) => {
      setCurriculumByInstrument(Object.fromEntries(entries));
    });
  }, [students]);

  function getProgress(student: DashboardStudent) {
    return getOverallProgress(student, curriculumByInstrument[student.instrument.toLowerCase()] ?? []);
  }

  const bandNames = Array.from(new Set(students.map((student) => student.band)));

  const bands = bandNames.map((bandName) => {
    const members = students.filter((student) => student.band === bandName);
    const progresses = members.map((student) => getProgress(student));
    const avgProgress = progresses.length
      ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length)
      : 0;
    const performanceReady = progresses.filter((progress) => progress >= 85).length;

    return {
      bandName,
      members,
      avgProgress,
      performanceReady,
    };
  });

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {bands.map((band) => (
        <div
          key={band.bandName}
          className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
        >
          <div className="mb-4 text-xl font-bold">{band.bandName}</div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-800 p-3">
              <div className="text-sm text-zinc-400">Students</div>
              <div className="mt-1 text-2xl font-bold">{band.members.length}</div>
            </div>

            <div className="rounded-xl border border-zinc-800 p-3">
              <div className="text-sm text-zinc-400">Avg Progress</div>
              <div className="mt-1 text-2xl font-bold">{band.avgProgress}%</div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Class Progress</span>
              <span>{band.avgProgress}%</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-red-600"
                style={{ width: `${band.avgProgress}%` }}
              />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 p-3">
            <div className="text-sm text-zinc-400">Performance Ready Students</div>
            <div className="mt-1 text-xl font-bold text-red-300">
              {band.performanceReady}
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {band.members.map((member) => {
              const progress = getProgress(member);

              return (
                <div
                  key={member.name}
                  className="rounded-xl border border-zinc-800 p-3"
                >
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>{member.name}</span>
                    <span>{progress}%</span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full bg-red-600"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}