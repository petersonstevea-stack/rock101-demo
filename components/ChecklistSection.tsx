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
            highFives: number;
        }
    >;
    onToggleDone: (item: string) => void;
    onToggleSigned?: (item: string) => void;
    onAddFistBump?: (item: string) => void;
    canEdit: boolean;
    canSign: boolean;
    showHeader?: boolean;
};

const FIST_BUMPS_TO_EARN = 10;

function isItemEarned(
    item: ChecklistItem,
    state?: {
        done: boolean;
        signed: boolean;
        date: string | null;
        highFives: number;
    }
) {
    if (!state) return false;

    if (item.location === "groupRehearsal" && state.highFives >= FIST_BUMPS_TO_EARN) {
        return true;
    }

    if (item.area === "requiredLessons") {
        return Boolean(state.signed);
    }

    return Boolean(state.done || state.signed);
}

export default function ChecklistSection({
    title,
    items,
    curriculum,
    onToggleDone,
    onToggleSigned,
    onAddFistBump,
    canEdit,
    canSign,
    showHeader = true,
}: ChecklistSectionProps) {
    const completedCount = items.filter((item) =>
        isItemEarned(item, curriculum[item.id])
    ).length;

    const percent =
        items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

    return (
        <div className="rounded-none border border-zinc-800 bg-zinc-950 p-5">
            {showHeader && (
                <>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="sor-heading text-xl text-white">{title}</h2>
                        <div className="text-sm font-semibold text-red-300">{percent}%</div>
                    </div>

                    <div className="mb-4 h-3 overflow-hidden rounded-none bg-[#333333]">
                        <div
                            className="h-full transition-all"
                            style={{
                                width: `${percent}%`,
                                backgroundColor: "var(--sor-red)"
                            }}
                        />
                    </div>
                </>
            )}

            <div className="grid gap-2">
                {items.map((item, index) => {
                    const state = curriculum[item.id];
                    const earned = isItemEarned(item, state);
                    const highFives = state?.highFives ?? 0;
                    const earnedByFistBumps =
                        item.location === "groupRehearsal" &&
                        highFives >= FIST_BUMPS_TO_EARN &&
                        !state?.signed;

                    return (
                        <div
                            key={`${item.id}-${index}`}
                            className={`rounded-none border px-4 py-3 transition ${earned
                                ? "border-[#cc0000] bg-zinc-900"
                                : "border-zinc-800 bg-zinc-900"
                                }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (canEdit) onToggleDone(item.id);
                                    }}
                                    className={`flex-1 text-left ${canEdit ? "cursor-pointer" : "cursor-default"
                                        }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="inline-flex items-center rounded-none border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm font-semibold tracking-[0.02em] text-white">
                                            {item.label}
                                        </span>
                                        <span className="ml-4 text-sm text-zinc-300">
                                            {earned ? "🏆" : "○"}
                                        </span>
                                    </div>
                                </button>

                                <div className="flex shrink-0 flex-wrap items-center gap-2">
                                    {onAddFistBump && canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => onAddFistBump(item.id)}
                                            className="rounded-none bg-zinc-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
                                        >
                                            🙌 High Fives {highFives}/{FIST_BUMPS_TO_EARN}
                                        </button>
                                    )}

                                    {canSign && onToggleSigned && (
                                        <button
                                            type="button"
                                            onClick={() => onToggleSigned(item.id)}
                                            className={`rounded-none px-3 py-2 text-sm font-medium transition ${state?.signed
                                                ? "bg-emerald-700 text-white hover:bg-emerald-600"
                                                : "bg-red-600 text-white hover:bg-red-500"
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

                            {earnedByFistBumps && (
                                <div className="mt-2 text-xs text-amber-300">
                                    Earned through 10 High Fives
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