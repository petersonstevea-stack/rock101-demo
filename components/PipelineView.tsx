"use client";

import { useState, useEffect } from "react";
import { fetchAllCurriculumItems, type CurriculumItem } from "@/lib/curriculumQueries";
import { getOverallProgress } from "@/lib/progress";

type PipelineStudent = {
  name: string;
  instrument: string;
  band: string;
  curriculum: Record<
    string,
    {
      done: boolean;
      signed: boolean;
      date: string | null;
      highFives: number;
    }
  >;
  notes: {
    instructor: string;
    director: string;
  };
  workflow: {
    instructorSubmitted: boolean;
    classInstructorSubmitted: boolean;
    parentSubmitted: boolean;
  };
};

type PipelineViewProps = {
  students: PipelineStudent[];
};

export default function PipelineView({ students }: PipelineViewProps) {
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

  function getProgress(student: PipelineStudent) {
    return getOverallProgress(student, curriculumByInstrument[student.instrument.toLowerCase()] ?? []);
  }

  const performanceReady = students.filter(
    (student) => getProgress(student) >= 85
  ).length;

  const stageReady = students.filter((student) => {
    const progress = getProgress(student);
    return progress >= 60 && progress < 85;
  }).length;

  const developing = students.filter((student) => {
    const progress = getProgress(student);
    return progress >= 25 && progress < 60;
  }).length;

  const newStudents = students.filter(
    (student) => getProgress(student) < 25
  ).length;

  const bandNames = Array.from(new Set(students.map((student) => student.band)));

  return (
    <div className="mt-8 grid gap-6">
      <div className="rounded-none border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-4 text-xl font-bold">Rock 101 Graduation Pipeline</div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-none border border-zinc-800 p-4">
            <div className="text-sm text-zinc-400">Performance Ready</div>
            <div className="mt-1 text-2xl font-bold">{performanceReady}</div>
          </div>

          <div className="rounded-none border border-zinc-800 p-4">
            <div className="text-sm text-zinc-400">Stage Ready</div>
            <div className="mt-1 text-2xl font-bold">{stageReady}</div>
          </div>

          <div className="rounded-none border border-zinc-800 p-4">
            <div className="text-sm text-zinc-400">Developing</div>
            <div className="mt-1 text-2xl font-bold">{developing}</div>
          </div>

          <div className="rounded-none border border-zinc-800 p-4">
            <div className="text-sm text-zinc-400">New Students</div>
            <div className="mt-1 text-2xl font-bold">{newStudents}</div>
          </div>
        </div>
      </div>

      <div className="rounded-none border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-4 text-xl font-bold">All Rock 101 Students by Class</div>

        <div className="grid gap-5">
          {bandNames.map((bandName) => (
            <div key={bandName} className="rounded-none border border-zinc-800 p-4">
              <div className="mb-4 text-lg font-bold">{bandName}</div>

              <div className="grid gap-3">
                {students
                  .filter((student) => student.band === bandName)
                  .map((student) => {
                    const progress = getProgress(student);

                    return (
                      <div
                        key={student.name}
                        className="rounded-none border border-zinc-800 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold">{student.name}</div>
                            <div className="text-sm text-zinc-400">
                              {student.instrument}
                            </div>
                          </div>

                          <div className="text-sm font-semibold text-[#cc0000]">
                            {progress}%
                          </div>
                        </div>

                        <div className="h-3 overflow-hidden rounded-none bg-zinc-800">
                          <div
                            className="h-full bg-[#cc0000]"
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
      </div>
    </div>
  );
}