type ChecklistItem = {
    id: string;
    label: string;
    description?: string;
    area?: string;
    location?: string;
    allowedSigner?: string;
    required?: boolean;
    requiredHighFives?: number;
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

    if (item.location === "groupRehearsal" && state.highFives >= (item.requiredHighFives ?? 10)) {
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
                        <div className="text-sm font-semibold text-[#cc0000]">{percent}%</div>
                    </div>

                    <div className="mb-4 h-3 overflow-hidden rounded-none bg-[#333333]">
                        <div
                            className="h-full transition-all"
                            style={{
                                width: `${percent}%`,
                                backgroundColor: "#cc0000"
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
                        highFives >= (item.requiredHighFives ?? 10) &&
                        !state?.signed;

                    return (
                        <div
                            key={`${item.id}-${index}`}
                            className={`rounded-none border border-zinc-800 px-4 py-3 transition ${earned
                                ? "bg-zinc-800"
                                : "bg-zinc-900"
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
                                            {earned ? "✓" : "○"}
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
                                            🏆 Awards {highFives}/{item.requiredHighFives ?? 10}
                                        </button>
                                    )}

                                    {canSign && onToggleSigned && (
                                        <button
                                            type="button"
                                            onClick={() => onToggleSigned(item.id)}
                                            className={`rounded-none px-3 py-2 text-sm font-medium transition ${(state?.signed || earned)
                                                ? "bg-zinc-700 text-white hover:bg-zinc-600"
                                                : "bg-[#cc0000] text-white hover:bg-[#b30000]"
                                                }`}
                                        >
                                            {(state?.signed || earned) ? "Signed" : "Sign"}
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
                                    Earned through {item.requiredHighFives ?? 10} Awards
                                </div>
                            )}

                            {state?.signed && state?.date && (
                                <div className="mt-2 text-xs text-zinc-500">
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