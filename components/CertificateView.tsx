import PageHero from "@/components/PageHero";
import { getOverallProgress, getStageLabel } from "@/lib/progress";

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

function formatInstrumentLabel(instrument: string) {
  const normalized = instrument.toLowerCase();

  if (normalized === "vocals" || normalized === "voice") return "Vocals";
  if (normalized === "keys") return "Keys";

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export default function CertificateView({ student }: CertificateViewProps) {
  const progress = getOverallProgress(student);
  const stage = getStageLabel(progress);
  const unlocked = progress >= 100;
  const instrumentLabel = formatInstrumentLabel(student.instrument);

  return (
    <div className="mt-8 space-y-6">
      <PageHero
        title="Certificate of Achievement"
        subtitle="A celebration of progress, consistency, and readiness for the next stage."
        imageSrc="/images/rock101-band.jpg"
      />

      {!unlocked ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/82 p-6 backdrop-blur-sm">
          <div className="mb-3 text-sm uppercase tracking-[0.2em] text-red-300">
            Certificate Locked
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
                <div className="mt-2 text-2xl font-bold text-red-300">
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
              <div className="text-xs uppercase tracking-[0.45em] text-red-300">
                School of Rock
              </div>

              <h2 className="mt-6 text-3xl font-black text-white md:text-5xl">
                Rock 101 Graduation Certificate
              </h2>

              <div className="mx-auto mt-6 h-px w-32 bg-red-500/40" />

              <p className="mt-8 text-sm uppercase tracking-[0.35em] text-zinc-400">
                Presented to
              </p>

              <div className="mt-4 text-4xl font-black text-red-300 md:text-6xl">
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
                  <div className="mt-2 text-2xl font-black text-red-300">
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

              <div className="mt-10 text-xs uppercase tracking-[0.3em] text-red-300">
                Keep practicing. Keep performing. Keep rocking.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
