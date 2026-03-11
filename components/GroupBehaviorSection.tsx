type GroupBehaviorSectionProps = {
  items: readonly string[];
  curriculum: Record<
    string,
    {
      done: boolean;
      signed: boolean;
      date: string | null;
      fistBumps: number;
    }
  >;
  onAddFistBump: (item: string) => void;
};

export default function GroupBehaviorSection({
  items,
  curriculum,
  onAddFistBump,
}: GroupBehaviorSectionProps) {
  const totalFistBumps = items.reduce(
    (sum, item) => sum + (curriculum[item]?.fistBumps || 0),
    0
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Group Behavior + Maturity</h2>
        <div className="text-sm text-red-300">{totalFistBumps} fist bumps</div>
      </div>

      <div className="mb-4 text-sm text-zinc-400">
        Directors can give a weekly shout-out when students demonstrate great
        rehearsal habits and bandmate behavior.
      </div>

      <div className="grid gap-3">
        {items.map((item) => {
          const fistBumps = curriculum[item]?.fistBumps || 0;

          return (
            <div
              key={item}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{item}</div>
                  <div className="mt-1 text-sm text-zinc-400">
                    Weekly shout-outs earned: {fistBumps}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onAddFistBump(item)}
                  className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500"
                >
                  🤜 Fist Bump
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from({ length: Math.max(10, fistBumps) }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm ${
                      i < fistBumps
                        ? "border-red-500 bg-red-950/40"
                        : "border-zinc-800 bg-zinc-950"
                    }`}
                  >
                    {i < fistBumps ? "🤜" : "•"}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}