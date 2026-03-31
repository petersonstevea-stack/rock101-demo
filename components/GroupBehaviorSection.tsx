type GroupBehaviorItem = {
  id: string;
  label: string;
};

type GroupBehaviorSectionProps = {
  items: readonly GroupBehaviorItem[];
  curriculum: Record<
    string,
    {
      done: boolean;
      signed: boolean;
      date: string | null;
      highFives: number;
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
    (sum, item) => sum + (curriculum[item.id]?.highFives || 0),
    0
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Weekly Fist Bumps</h2>
        <div className="text-sm text-[#cc0000]">{totalFistBumps} total</div>
      </div>

      <div className="grid gap-2">
        {items.map((item) => {
          const highFives = curriculum[item.id]?.highFives || 0;
          const earnedBadge = highFives >= 10;

          return (
            <div
              key={item.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-white">{item.label}</div>
                  <div className="mt-1 text-sm text-zinc-400">
                    {highFives} fist bump{highFives === 1 ? "" : "s"}
                  </div>
                  {earnedBadge && (
                    <div className="mt-1 text-xs font-medium text-[#cc0000]">
                      Badge earned
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onAddFistBump(item.id)}
                  className="rounded-none bg-[#cc0000] px-3 py-2 text-sm font-medium text-white hover:bg-[#b30000]"
                >
                  + Fist Bump
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}