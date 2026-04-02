"use client";

import { useState, useEffect } from "react";
import PageHero from "@/components/PageHero";
import {
  fetchGraduationRequirements,
  fetchMethodLessonsWithMonths,
  fetchRehearsalBehaviors,
  type CurriculumItem,
} from "@/lib/curriculumQueries";
import { getStageLabel } from "@/lib/progress";

type CertificateStudent = {
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

type CertificateViewProps = {
  student: CertificateStudent;
};

const FIST_BUMPS_TO_EARN = 10;

function formatInstrumentLabel(instrument: string) {
  const normalized = instrument.toLowerCase();

  if (normalized === "vocals" || normalized === "voice") return "Vocals";
  if (normalized === "keys") return "Keys";

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function isItemEarned(
  item: {
    id: string;
    location?: string;
  },
  progress?: {
    done: boolean;
    signed: boolean;
    date: string | null;
    highFives: number;
  }
) {
  if (!progress) return false;

  if (
    item.location === "groupRehearsal" &&
    progress.highFives >= FIST_BUMPS_TO_EARN
  ) {
    return true;
  }

  return Boolean(progress.done || progress.signed);
}

function computeCertificateProgress(
  allItems: CurriculumItem[],
  curriculum: CertificateStudent["curriculum"]
) {
  const completed = allItems.filter((item) =>
    isItemEarned(item, curriculum[item.id])
  ).length;

  const total = allItems.length;

  if (total === 0) return 0;

  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

function splitCertificateTitle(title: string) {
  const words = title.split(" ");

  if (words.length <= 1) {
    return {
      firstPart: title,
      secondPart: "",
    };
  }

  return {
    firstPart: words.slice(0, 1).join(" "),
    secondPart: words.slice(1).join(" "),
  };
}

export default function CertificateView({ student }: CertificateViewProps) {
  const [allItems, setAllItems] = useState<CurriculumItem[]>([]);

  useEffect(() => {
    Promise.all([
      fetchGraduationRequirements(student.instrument),
      fetchMethodLessonsWithMonths(student.instrument),
      fetchRehearsalBehaviors(),
    ]).then(([grad, lessons, rehearsal]) => {
      setAllItems([...grad, ...lessons, ...rehearsal]);
    });
  }, [student.instrument]);

  const progress = computeCertificateProgress(allItems, student.curriculum);
  const stage = getStageLabel(progress);
  const unlocked = progress >= 100;
  const instrumentLabel = formatInstrumentLabel(student.instrument);
  const { firstPart, secondPart } = splitCertificateTitle(
    "Certificate Achievement"
  );

  return (
    <div className="min-h-screen bg-white">
    <div className="p-6 space-y-6">
      <PageHero
        title="Certificate of Achievement"
        subtitle="A celebration of progress, consistency, and readiness for the next stage."
        imageSrc="/images/rock101-band.jpg"
      />

      <div className="space-y-5">
        <div className="bg-[#111111] rounded-none p-5">
          <div>
            <h2 className="sor-display text-2xl md:text-4xl lg:text-5xl leading-none">
              <span style={{ color: "#cc0000" }}>{firstPart.toUpperCase()}</span>
              {secondPart && (
                <span className="ml-2 text-white italic normal-case">
                  {secondPart}
                </span>
              )}
            </h2>

            <div className="sor-divider" />
          </div>
        </div>

        {!unlocked ? (
          <div className="rounded-none bg-zinc-950 p-6">
            <div className="mb-4">
              <div className="sor-display text-3xl md:text-4xl leading-none">
                <span style={{ color: "#cc0000" }}>Certificate</span>
                <span className="ml-2 text-white italic normal-case">
                  Locked
                </span>
              </div>
              <div className="sor-divider" />
            </div>

            <div className="grid gap-4 text-white">
              <div className="rounded-none bg-[#1a1a1a] p-4">
                The graduation certificate becomes available only after the
                student completes 100% of the Rock 101 course.
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-none bg-[#1a1a1a] p-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                    Current Progress
                  </div>
                  <div className="mt-2 text-3xl font-black text-white">
                    {progress}%
                  </div>
                </div>

                <div className="rounded-none bg-[#1a1a1a] p-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                    Current Stage
                  </div>
                  <div className="mt-2 text-2xl font-bold" style={{ color: "#cc0000" }}>
                    {stage}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-none bg-zinc-950 p-6">
            <div className="mx-auto max-w-4xl rounded-none bg-[#111111] p-8 md:p-12">
              <div className="rounded-none bg-[#1a1a1a] p-8 text-center md:p-12">
                <div className="sor-display text-sm tracking-[0.45em]" style={{ color: "#cc0000" }}>
                  School of Rock
                </div>

                <h2 className="mt-6 sor-display text-3xl leading-none md:text-5xl">
                  <span style={{ color: "#cc0000" }}>Rock 101</span>
                  <span className="ml-2 text-white italic normal-case">
                    Graduation Certificate
                  </span>
                </h2>

                <div className="mx-auto mt-4 h-[4px] w-40" style={{ backgroundColor: "#cc0000" }} />

                <p className="mt-8 text-sm uppercase tracking-[0.35em] text-zinc-400">
                  Presented to
                </p>

                <div className="mt-4 sor-display text-4xl leading-none md:text-6xl" style={{ color: "#cc0000" }}>
                  {student.name}
                </div>

                <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-zinc-200 md:text-lg">
                  For completing the Rock 101 curriculum and demonstrating
                  readiness for the Performance Program as a{" "}
                  <span className="font-semibold text-white">
                    {instrumentLabel}
                  </span>{" "}
                  student.
                </p>

                <div className="mt-10 grid gap-4 md:grid-cols-2">
                  <div className="rounded-none bg-zinc-900 p-5">
                    <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Instrument
                    </div>
                    <div className="mt-2 text-xl font-bold text-white">
                      {instrumentLabel}
                    </div>
                  </div>

                  <div className="rounded-none bg-zinc-900 p-5">
                    <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Band
                    </div>
                    <div className="mt-2 text-xl font-bold text-white">
                      {student.band || "Rock 101"}
                    </div>
                  </div>
                </div>

                <div className="mt-10 grid gap-4 md:grid-cols-2">
                  <div className="rounded-none bg-zinc-900 p-5">
                    <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Final Progress
                    </div>
                    <div className="mt-2 text-2xl font-black" style={{ color: "#cc0000" }}>
                      {progress}%
                    </div>
                  </div>

                  <div className="rounded-none bg-zinc-900 p-5">
                    <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Stage
                    </div>
                    <div className="mt-2 text-2xl font-black text-white">
                      {stage}
                    </div>
                  </div>
                </div>

                <div className="mt-12 grid gap-8 md:grid-cols-2">
                  <div className="text-center">
                    <div className="mx-auto h-px w-40 bg-zinc-600" />
                    <div className="mt-3 text-sm uppercase tracking-[0.25em] text-zinc-400">
                      Rock 101 Instructor
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="mx-auto h-px w-40 bg-zinc-600" />
                    <div className="mt-3 text-sm uppercase tracking-[0.25em] text-zinc-400">
                      Rock 101 Class Instructor
                    </div>
                  </div>
                </div>

                <div className="mt-10 sor-display text-xs tracking-[0.3em]" style={{ color: "#cc0000" }}>
                  Keep practicing. Keep performing. Keep rocking.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}