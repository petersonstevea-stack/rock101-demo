import type { StudentRecord } from "@/types/student";
import { getOverallProgress, getStageLabel } from "@/lib/progress";

type CertificateViewProps = {
  student: StudentRecord;
};

export default function CertificateView({ student }: CertificateViewProps) {
  const progress = getOverallProgress(student);
  const stage = getStageLabel(progress);
  const unlocked = progress >= 100;

  if (!unlocked) {
    return (
      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="mb-3 text-sm uppercase tracking-[0.2em] text-red-300">
          Certificate Locked
        </div>

        <div className="grid gap-3 text-white">
          <div>
            The graduation certificate becomes available only after the student
            completes 100% of the Rock 101 course.
          </div>
          <div>Current progress: {progress}%</div>
          <div>Current stage: {stage}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-red-500 bg-zinc-950 p-10 text-center">
      <div className="uppercase tracking-widest text-red-300">
        School of Rock
      </div>

      <h2 className="mt-4 text-4xl font-black">
        Rock 101 Graduation Certificate
      </h2>

      <p className="mt-6">Presented to</p>

      <div className="mt-2 text-5xl font-black text-red-300">
        {student.name}
      </div>

      <p className="mt-6">
        For completing the Rock 101 curriculum and demonstrating readiness for
        the Performance Program.
      </p>
    </div>
  );
}