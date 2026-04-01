"use client";

import type { ParentDashboardData } from "@/types/parent-dashboard";

type Props = {
    data: ParentDashboardData;
    lessonNotes?: string;
    rehearsalNotes?: string;
    lessonLastUpdated?: string | null;
    rehearsalLastUpdated?: string | null;
    onNavigate?: (
        tab: "privateLesson" | "groupRehearsal" | "certificate"
    ) => void;
};
function formatNameShort(name?: string) {
    if (!name) return "";

    const parts = name.trim().split(" ");
    const first = parts[0];
    const lastInitial = parts[1] ? parts[1][0] + "." : "";

    return `${first} ${lastInitial}`.trim();
}
function splitSectionTitle(title: string) {
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

function StatCard({
    label,
    value,
    sublabel,
    highlight,
}: {
    label: string;
    value: string;
    sublabel?: string;
    highlight?: boolean;
}) {
    return (
        <div className={`rounded-none p-5 ${highlight ? "bg-[#cc0000]" : "bg-[#111111]"}`}>
            <div className={`text-xs uppercase tracking-[0.18em] ${highlight ? "text-white/60" : "text-zinc-400"}`}>
                {label}
            </div>
            <div className="mt-2 text-3xl font-bold text-white">{value}</div>
            {sublabel ? (
                <div className={`mt-1 text-sm ${highlight ? "text-white/50" : "text-zinc-400"}`}>{sublabel}</div>
            ) : null}
        </div>
    );
}

function SectionCard({
    title,
    children,
    rightSlot,
}: {
    title: string;
    children: React.ReactNode;
    rightSlot?: React.ReactNode;
}) {
    const { firstPart, secondPart } = splitSectionTitle(title);

    return (
        <section className="space-y-5 rounded-none">
            <div className="bg-[#111111] rounded-none p-5">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="sor-display text-4xl md:text-5xl leading-none text-white">
                            {title}
                        </h2>
                        <div className="sor-divider" />
                    </div>
                    {rightSlot}
                </div>
            </div>

            <div className="rounded-none bg-[#111111] p-6">
                {children}
            </div>
        </section>
    );
}

function formatPerformanceDate(dateStr?: string | null): string {
    if (!dateStr) return "Not scheduled";
    const date = new Date(dateStr + "T00:00:00");
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate();
    const suffix =
        day === 1 || day === 21 || day === 31 ? "st"
        : day === 2 || day === 22 ? "nd"
        : day === 3 || day === 23 ? "rd"
        : "th";
    const month = date.toLocaleDateString("en-US", { month: "long" });
    return `${month} ${day}${suffix}`;
}

function PriorityPill({ priority }: { priority: "high" | "medium" | "low" }) {
    const classes =
        priority === "high"
            ? "bg-[#cc0000] text-white"
            : priority === "medium"
                ? "bg-zinc-700 text-zinc-200"
                : "bg-zinc-700 text-zinc-300";

    return (
        <span
            className={`rounded-none px-2.5 py-1 text-xs font-semibold uppercase ${classes}`}
        >
            {priority}
        </span>
    );
}

function ProgressNavCard({
    label,
    value,
    meta,
    onClick,
}: {
    label: string;
    value: number;
    meta: string;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full rounded-none border border-zinc-800 bg-[#1a1a1a] p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-800"
        >
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-white">{label}</span>
                        <span className="shrink-0 text-zinc-400">{meta}</span>
                    </div>

                    <div className="mt-3 h-3 w-full overflow-hidden rounded-none bg-[#333333]">
                        <div
                            className="h-full rounded-none bg-[#cc0000] transition-all"
                            style={{ width: `${value}%` }}
                        />
                    </div>
                </div>

                <div className="text-lg text-zinc-500">›</div>
            </div>
        </button>
    );
}
function formatLastUpdatedLabel(
    dateString?: string | null,
    authorName?: string | null
) {
    if (!dateString) return "Not yet updated";

    const date = new Date(dateString);

    if (isNaN(date.getTime())) return "Not yet updated";

    const formatted = `Last updated ${date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    })} · ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    })}`;

    return authorName
        ? `${formatted} by ${formatNameShort(authorName)}`
        : formatted;
}
function NotesPanelCard({
    title,
    value,
    emptyText,
    lastUpdated,
    authorName,
}: {
    title: string;
    value?: string;
    emptyText: string;
    lastUpdated?: string | null;
    authorName?: string | null;
}) {
    const hasContent = Boolean(value?.trim());
    function formatLastUpdatedLabel(
        dateString?: string | null,
        authorName?: string | null
    ) {
        if (!dateString) return "Not yet updated";

        const date = new Date(dateString);

        if (isNaN(date.getTime())) return "Not yet updated";

        const formatted = `Last updated ${date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        })} · ${date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        })}`;

        return authorName
            ? `${formatted} by ${formatNameShort(authorName)}`
            : formatted;
    }
    return (
        <div className="rounded-none border-l-2 border-l-[#cc0000] bg-[#1a1a1a] p-4">
            <div className="text-base font-semibold text-white">{title}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                {formatLastUpdatedLabel(lastUpdated, authorName)}
            </div>

            {hasContent ? (
                <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-400">
                    {value}
                </div>
            ) : (
                <div className="mt-4 rounded-none border border-dashed border-zinc-700 bg-[#111111] p-4 text-sm text-zinc-500">
                    {emptyText}
                </div>
            )}
        </div>
    );
}

function RecentActivityCard({
    items,
}: {
    items: ParentDashboardData["recentActivity"];
}) {
    return (
        <div className="space-y-3">
            {items.length ? (
                items.map((item) => {
                    const accent =
                        item.type === "groupRehearsal"
                            ? "bg-zinc-700 text-emerald-300"
                            : item.type === "badge"
                                ? "bg-zinc-700 text-amber-300"
                                : "bg-[#cc0000] text-white";

                    const label =
                        item.type === "groupRehearsal"
                            ? "Group Rehearsal"
                            : item.type === "badge"
                                ? "Badge"
                                : "Private Lesson";

                    return (
                        <div
                            key={item.id}
                            className="rounded-none bg-[#1a1a1a] p-4"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`rounded-none px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${accent}`}
                                        >
                                            {label}
                                        </span>
                                        <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                                            {item.dateLabel}
                                        </span>
                                    </div>

                                    <div className="mt-3 font-medium text-white">{item.title}</div>

                                    <div className="mt-1 text-sm text-zinc-400">
                                        {item.description}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="rounded-none border border-dashed border-zinc-700 bg-[#1a1a1a] p-4 text-sm text-zinc-500">
                    No recent activity has been recorded yet.
                </div>
            )}
        </div>
    );
}

export default function ParentDashboardOverview({
    data,
    lessonNotes,
    rehearsalNotes,
    lessonLastUpdated,
    rehearsalLastUpdated,
    onNavigate,
}: Props) {
    return (
        <div className="min-h-screen bg-white">
        <div className="p-6 space-y-6">
            <section className="bg-[#111111] overflow-hidden rounded-none p-6">
                <div>
                    <h1 className="sor-display mt-2 text-4xl leading-none md:text-6xl">
                        <span className="text-white">{data.student.name}</span>
                    </h1>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm text-zinc-300">
                        <span className="rounded-none bg-[#333333] px-3 py-1">
                            {data.student.instrument}
                        </span>
                        <span className="rounded-none bg-[#333333] px-3 py-1">
                            {data.student.className}
                        </span>
                        <span className="rounded-none bg-[#333333] px-3 py-1">
                            {data.student.schoolName}
                        </span>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <NotesPanelCard
                    title={
                        data.notesMeta.lessonAuthorName
                            ? `${formatNameShort(data.notesMeta.lessonAuthorName)}'s lesson notes for ${data.student.name}`
                            : `Lesson Notes for ${data.student.name}`
                    }
                    value={lessonNotes}
                    emptyText="No private lesson notes have been added yet."
                    lastUpdated={lessonLastUpdated}
                    authorName={data.notesMeta.lessonAuthorName}
                />
                <NotesPanelCard
                    title={
                        data.notesMeta.rehearsalAuthorName
                            ? `${formatNameShort(data.notesMeta.rehearsalAuthorName)}'s rehearsal notes for ${data.student.name}`
                            : `Rehearsal Notes for ${data.student.name}`
                    }
                    value={rehearsalNotes}
                    emptyText="No group rehearsal notes have been added yet."
                    lastUpdated={rehearsalLastUpdated}
                    authorName={data.notesMeta.rehearsalAuthorName}
                />
                <NotesPanelCard
                    title={`Rock 101 Class: ${data.student.className}`}
                    value={data.classFeedback ?? ""}
                    emptyText="No class update has been added yet."
                    lastUpdated={null}
                />
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard
                    {...data.stats.privateLessons}
                    label="Method App Lessons"
                />

                <StatCard
                    {...data.stats.graduationRequirements}
                    label="Graduation Requirements"
                />

                <StatCard
                    {...data.stats.groupRehearsal}
                    label="Group Rehearsal"
                />

                <StatCard
                    {...data.stats.highFives}
                    label="Rehearsal Awards"
                />

                <StatCard
                    label="Next Performance"
                    value={formatPerformanceDate(data.student.nextPerformanceDate)}
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                <SectionCard title="Progress">
                    <div className="space-y-4">
                        <ProgressNavCard
                            label={data.progress.graduationRequirements.label}
                            value={data.progress.graduationRequirements.percent}
                            meta={`${data.progress.graduationRequirements.completed}/${data.progress.graduationRequirements.total}`}
                            onClick={() =>
                                onNavigate?.(data.progress.graduationRequirements.targetTab)
                            }
                        />
                        {data.songs.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                                    Song Progress
                                </div>

                                {data.songs.map((item) => (
                                    <button
                                        key={item.song}
                                        type="button"
                                        onClick={() => onNavigate?.(item.targetTab)}
                                        className="w-full rounded-none border border-zinc-800 bg-[#1a1a1a] p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-800"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="min-w-0">
                                                <div className="font-medium text-white">{item.song}</div>
                                                <div className="mt-1 text-sm text-zinc-400">{item.label}</div>
                                            </div>

                                            <div className="text-sm font-semibold text-[#cc0000]">
                                                {item.readiness}/5
                                            </div>
                                        </div>

                                        <div className="mt-3 h-3 w-full overflow-hidden rounded-none bg-[#333333]">
                                            <div
                                                className="h-full rounded-none bg-[#cc0000] transition-all"
                                                style={{ width: `${(item.readiness / 5) * 100}%` }}
                                            />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        <ProgressNavCard
                            label={data.progress.methodAppLessons.label}
                            value={data.progress.methodAppLessons.percent}
                            meta={`${data.progress.methodAppLessons.completed}/${data.progress.methodAppLessons.total}`}
                            onClick={() =>
                                onNavigate?.(data.progress.methodAppLessons.targetTab)
                            }
                        />

                        <ProgressNavCard
                            label={data.progress.rehearsalReadiness.label}
                            value={data.progress.rehearsalReadiness.percent}
                            meta={`${data.progress.rehearsalReadiness.completed}/${data.progress.rehearsalReadiness.total}`}
                            onClick={() =>
                                onNavigate?.(data.progress.rehearsalReadiness.targetTab)
                            }
                        />

                        <ProgressNavCard
                            label={data.progress.certificate.label}
                            value={data.progress.certificate.percent}
                            meta={`${data.progress.certificate.completed}/${data.progress.certificate.total}`}
                            onClick={() => onNavigate?.(data.progress.certificate.targetTab)}
                        />
                    </div>
                </SectionCard>

                <SectionCard title="Summary">
                    <div className="rounded-none border-l-2 border-l-[#cc0000] bg-[#1a1a1a] p-4">
                        <div className="text-base font-semibold text-white">
                            {data.summary.title}
                        </div>
                        <div className="mt-3 text-sm leading-7 text-zinc-400">
                            {data.summary.text}
                        </div>
                    </div>
                </SectionCard>
            </section>

            <SectionCard title="What's Next">
                <div className="space-y-3">
                    {data.whatsNext.length ? (
                        data.whatsNext.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-none bg-[#1a1a1a] p-4"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="font-medium text-white">{item.label}</div>
                                        <div className="mt-1 text-sm capitalize text-zinc-500">
                                            {item.area}
                                        </div>
                                        {item.description ? (
                                            <div className="mt-2 text-sm text-zinc-400">
                                                {item.description}
                                            </div>
                                        ) : null}
                                    </div>
                                    <PriorityPill priority={item.priority} />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="rounded-none bg-[#1a1a1a] p-4 text-sm text-zinc-300">
                            Everything currently tracked is complete.
                        </div>
                    )}
                </div>
            </SectionCard>

            <SectionCard title="Recent Activity">
                <RecentActivityCard items={data.recentActivity} />
            </SectionCard>
        </div>
        </div>
    );
}
