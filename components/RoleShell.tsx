import { getOverallProgress, getStageLabel } from "@/lib/progress";

type RoleShellStudent = {
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

type RoleShellProps = {
  role: "student" | "instructor" | "director";
  student: RoleShellStudent;
  onLogout: () => void;
};

export default function RoleShell({
  role,
  student,
  onLogout,
}: RoleShellProps) {
  const progress = getOverallProgress(student, []);
  const stage = getStageLabel(progress);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-red-300">
            {role}
          </div>
          <h1 className="mt-2 text-4xl font-bold">Rock 101 Demo App</h1>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg bg-zinc-800 px-4 py-2 hover:bg-zinc-700"
        >
          Log Out
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-sm text-zinc-400">Student</div>
          <div className="mt-1 text-xl font-semibold">{student.name}</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-sm text-zinc-400">Instrument</div>
          <div className="mt-1 text-xl font-semibold">{student.instrument}</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-sm text-zinc-400">Band</div>
          <div className="mt-1 text-xl font-semibold">{student.band}</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-sm text-zinc-400">Progress</div>
          <div className="mt-1 text-xl font-semibold">
            {progress}% · {stage}
          </div>
        </div>
      </div>
    </div>
  );
}