type ChecklistItem = {
  id: string;
  label: string;
  description?: string;
  area?: string;
  location?: string;
  allowedSigner?: string;
  required?: boolean;
};

type ChecklistSectionProps = {
  title: string;
  items: readonly ChecklistItem[];
  curriculum: Record<
    string,
    {
      done: boolean;
      signed: boolean;
      date: string | null;
      fistBumps: number;
    }
  >;
  onToggleDone: (item: string) => void;
  onToggleSigned?: (item: string) => void;
  onAddFistBump?: (item: string) => void;
  canEdit: boolean;
  canSign: boolean;
};

export default function ChecklistSection({
  title,
  items,
  curriculum,
  onToggleDone,
  onToggleSigned,
  onAddFistBump,
  canEdit,
  canSign,
}: ChecklistSectionProps) {
  const completedCount = items.filter(
    (item) => curriculum[item.id]?.done || curriculum[item.id]?.signed
  ).length;

  const percent =
    items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <div className="text-sm text-red-300">{percent}%</div>
      </div>

      <div className="mb-4 h-3 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full bg-red-600 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="grid gap-2">
        {items.map((item) => {
          const state = curriculum[item.id];
          const checked = state?.done || state?.signed;
          const fistBumps = state?.fistBumps ?? 0;

          return (
            <div
              key={item.id}
              className={`rounded-lg border px-4 py-3 ${
                checked
                  ? "border-red-500 bg-red-950/20"
                  : "border-zinc-800 bg-zinc-900"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => canEdit && onToggleDone(item.id)}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span>{item.label}</span>
                    <span className="ml-4 text-sm">{checked ? "✓" : "○"}</span>
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  {onAddFistBump && (
                    <button
                      type="button"
                      onClick={() => onAddFistBump(item.id)}
                      className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                    >
                      🤜 {fistBumps}
                    </button>
                  )}

                  {canSign && onToggleSigned && (
                    <button
                      type="button"
                      onClick={() => onToggleSigned(item.id)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium ${
                        state?.signed
                          ? "bg-red-600 text-white"
                          : "bg-zinc-800 text-white hover:bg-zinc-700"
                      }`}
                    >
                      {state?.signed ? "Signed" : "Sign"}
                    </button>
                  )}
                </div>
              </div>

              {item.description && (
                <div className="mt-2 text-xs text-zinc-400">
                  {item.description}
                </div>
              )}

              {state?.signed && state?.date && (
                <div className="mt-2 text-xs text-red-300">
                  Signed {state.date}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
