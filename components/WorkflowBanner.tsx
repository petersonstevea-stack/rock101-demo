type WorkflowBannerProps = {
  ready: boolean;
  submitted: boolean;
  studentName: string;
  onSubmit: () => void;
};

export default function WorkflowBanner({
  ready,
  submitted,
  studentName,
  onSubmit,
}: WorkflowBannerProps) {
  if (submitted) {
    return (
      <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-white">
        Weekly report has been submitted to the parent for {studentName}.
      </div>
    );
  }

  if (!ready) return null;

  return (
    <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/20 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-red-300">
            Weekly report ready
          </div>
          <div className="mt-1 text-white">
            Both instructor and Rock 101 Director feedback have been saved. This
            weekly report is ready to be sent to the parent.
          </div>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500"
        >
          Submit to Parents
        </button>
      </div>
    </div>
  );
}