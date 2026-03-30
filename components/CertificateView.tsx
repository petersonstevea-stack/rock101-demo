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
    fistBumps: number;
  }
) {
  if (!progress) return false;

  if (
    item.location === "groupRehearsal" &&
    progress.fistBumps >= FIST_BUMPS_TO_EARN
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
    <div className="mt-8 space-y-6">
      <PageHero
        title="Certificate of Achievement"
        subtitle="A celebration of progress, consistency, and readiness for the next stage."
        imageSrc="/images/rock101-band.jpg"
      />

      <div className="space-y-5 rounded-xl p-2 ring-2 ring-[var(--sor-red)] ring-offset-2 ring-offset-black">
        <div className="sor-finish-card rounded-2xl p-5">
          <div>
            <h2 className="sor-display text-4xl md:text-5xl leading-none">
              <span className="sor-display-red">{firstPart.toUpperCase()}</span>
              {secondPart && (
                <span className="ml-2 text-white italic opacity-80 normal-case">
                  {secondPart}
                </span>
              )}
            </h2>

            <div className="sor-divider" />
          </div>
        </div>

        {!unlocked ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/82 p-6 backdrop-blur-sm">
            <div className="mb-4">
              <div className="sor-display text-3xl md:text-4xl leading-none">
                <span className="sor-display-red">Certificate</span>
                <span className="ml-2 text-white italic opacity-80 normal-case">
                  Locked
                </span>
              </div>
              <div className="sor-divider" />
            </div>

            <div className="grid gap-4 text-white">
              <div className="rounded-xl border border-zinc-800 bg-black/35 p-4 backdrop-blur-sm">
                The graduation certificate becomes available only after the
                student completes 100% of the Rock 101 course.
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-zinc-800 bg-black/35 p-4 backdrop-blur-sm">
                  <div className="text-xs uppercase tracking-[0.25em] text-zinc-400">
                    Current Progress
                  </div>
                  <div className="mt-2 text-3xl font-black text-white">
                    {progress}%
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-black/35 p-4 backdrop-blur-sm">
                  <div className="text-xs uppercase tracking-[0.25em] text-zinc-400">
                    Current Stage
                  </div>
                  <div className="mt-2 text-2xl font-bold text-[var(--sor-red)]">
                    {stage}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/82 p-6 backdrop-blur-sm">
            <div className="mx-auto max-w-4xl rounded-3xl border border-red-500/30 bg-gradient-to-br from-zinc-950 via-black to-red-950/30 p-8 shadow-[0_0_40px_rgba(255,0,0,0.08)] md:p-12">
              <div className="rounded-2xl border border-zinc-800 bg-black/35 p-8 text-center backdrop-blur-sm md:p-12">
                <div className="sor-display sor-display-red text-sm tracking-[0.45em]">
                  School of Rock
                </div>

                <h2 className="mt-6 sor-display text-3xl leading-none md:text-5xl">
                  <span className="sor-display-red">Rock 101</span>
                  <span className="ml-2 text-white italic opacity-80 normal-case">
                    Graduation Certificate
                  </span>
                </h2>

                <div className="mx-auto mt-4 h-[4px] w-40 rounded-full bg-[var(--sor-red)]" />

                <p className="mt-8 text-sm uppercase tracking-[0.35em] text-zinc-400">
                  Presented to
                </p>

                <div className="mt-4 sor-display text-4xl leading-none text-[var(--sor-red)] md:text-6xl">
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
                  <div className="rounded-2xl border border-zinc-800 bg-black/35 p-5 backdrop-blur-sm">
                    <div className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                      Instrument
                    </div>
                    <div className="mt-2 text-xl font-bold text-white">
                      {instrumentLabel}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-black/35 p-5 backdrop-blur-sm">
                    <div className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                      Band
                    </div>
                    <div className="mt-2 text-xl font-bold text-white">
                      {student.band || "Rock 101"}
                    </div>
                  </div>
                </div>

                <div className="mt-10 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-800 bg-black/35 p-5 backdrop-blur-sm">
                    <div className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                      Final Progress
                    </div>
                    <div className="mt-2 text-2xl font-black text-[var(--sor-red)]">
                      {progress}%
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-black/35 p-5 backdrop-blur-sm">
                    <div className="text-xs uppercase tracking-[0.3em] text-zinc-400">
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
                      Rock 101 Director
                    </div>
                  </div>
                </div>

                <div className="mt-10 sor-display sor-display-red text-xs tracking-[0.3em]">
                  Keep practicing. Keep performing. Keep rocking.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}