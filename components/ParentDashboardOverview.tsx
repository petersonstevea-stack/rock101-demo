"use client";

import type { ParentDashboardData } from "@/types/parent-dashboard";

type Props = {
    data: ParentDashboardData;
    lessonNotes?: string;
    rehearsalNotes?: string;
};

function StatCard({
    label,
    value,
    sublabel,
}: {
    label: string;
    value: string;
    sublabel?: string;
}) {
    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                {label}
            </div>
            <div className="mt-2 text-3xl font-bold text-white">{value}</div>
            {sublabel ? (
                <div className="mt-1 text-sm text-zinc-400">{sublabel}</div>
            ) : null}
        </div>
    );
}

function ProgressBar({
    label,
    value,
    meta,
}: {
    label: string;
    value: number;
    meta: string;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="text-white">{label}</span>
                <span className="text-zinc-400">{meta}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                    className="h-full rounded-full bg-red-600 transition-all"
                    style={{ width: `${value}%` }}
                />
            </div>
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
    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="sor-heading text-xl text-white">{title}</h2>
                {rightSlot}
            </div>
            {children}
        </section>
    );
}

function PriorityPill({ priority }: { priority: "high" | "medium" | "low" }) {
    const classes =
        priority === "high"
            ? "bg-red-500/20 text-red-300"
            : priority === "medium"
                ? "bg-amber-500/20 text-amber-300"
                : "bg-zinc-700 text-zinc-300";

    return (
        <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${classes}`}
        >
            {priority}
        </span>
    );
}

function NotesCard({
    title,
    value,
    emptyText,
}: {
    title: string;
    value?: string;
    emptyText: string;
}) {
    const hasContent = Boolean(value?.trim());

    return (
        <SectionCard title={title}>
            {hasContent ? (
                <div className="whitespace-pre-wrap rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm leading-7 text-zinc-300">
                    {value}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
                    {emptyText}
                </div>
            )}
        </SectionCard>
    );
}

export default function ParentDashboardOverview({
    data,
    lessonNotes,
    rehearsalNotes,
}: Props) {
    return (
        <div className="mt-8 space-y-6">
            <section className="overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-red-950 p-6 shadow-lg">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="text-sm uppercase tracking-[0.2em] text-zinc-400">
                            Parent Dashboard
                        </div>
                        <h1 className="sor-heading mt-2 text-4xl text-white">
                            {data.student.name}
                        </h1>
                        <div className="mt-3 flex flex-wrap gap-2 text-sm text-zinc-200">
                            <span className="rounded-full bg-white/10 px-3 py-1">
                                {data.student.instrument}
                            </span>
                            <span className="rounded-full bg-white/10 px-3 py-1">
                                {data.student.className}
                            </span>
                            <span className="rounded-full bg-white/10 px-3 py-1">
                                {data.student.schoolName}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl bg-zinc-950 p-4">
                            <div className="text-sm text-zinc-400">Certificate Status</div>
                            <div className="mt-1 text-lg font-semibold text-white">
                                {data.certificate.earned ? "Earned" : "Not yet earned"}
                            </div>
                            <div className="mt-2 text-sm text-zinc-400">
                                {data.certificate.completedRequired}/
                                {data.certificate.totalRequired} required items complete
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-4">
                        <div className="text-sm text-zinc-300">Next Performance</div>
                        <div className="mt-1 text-lg font-semibold text-white">
                            {data.student.nextPerformanceDate || "Not scheduled"}
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard {...data.stats.privateLessons} />
                <StatCard {...data.stats.groupRehearsal} />
                <StatCard {...data.stats.badgesEarned} />
                <StatCard {...data.stats.fistBumps} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                <SectionCard
                    title="Progress"
                    rightSlot={
                        <span
                            className={`rounded-full px-3 py-1 text-sm font-semibold uppercase ${data.rehearsalReady.ready
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : "bg-amber-500/20 text-amber-300"
                                }`}
                        >
                            {data.rehearsalReady.label}
                        </span>
                    }
                >
                    <div className="space-y-5">
                        <ProgressBar
                            label="Private Lesson Progress"
                            value={data.progress.privateLessons.percent}
                            meta={`${data.progress.privateLessons.completed}/${data.progress.privateLessons.total}`}
                        />
                        <ProgressBar
                            label="Group Rehearsal Progress"
                            value={data.progress.groupRehearsal.percent}
                            meta={`${data.progress.groupRehearsal.completed}/${data.progress.groupRehearsal.total}`}
                        />

                        <div className="rounded-2xl bg-zinc-950 p-4 text-sm text-zinc-300">
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-white">{data.certificate.label}</span>
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${data.certificate.earned
                                            ? "bg-emerald-500/20 text-emerald-300"
                                            : "bg-amber-500/20 text-amber-300"
                                        }`}
                                >
                                    {data.certificate.earned ? "Earned" : "In Progress"}
                                </span>
                            </div>
                            <div className="mt-2 text-zinc-400">
                                {data.certificate.completedRequired}/
                                {data.certificate.totalRequired} required items complete
                            </div>
                            <div className="mt-2 text-zinc-500">
                                {data.certificate.description}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-zinc-950 p-4 text-sm text-zinc-300">
                            {data.rehearsalReady.description}
                        </div>
                    </div>
                </SectionCard>

                <SectionCard title="Badge & Certificate Summary">
                    <div className="space-y-4">
                        <div className="rounded-2xl bg-zinc-950 p-4">
                            <div className="text-sm text-zinc-400">Badges Earned</div>
                            <div className="mt-1 text-3xl font-bold text-white">
                                {data.badgeSummary.earned}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-zinc-950 p-4">
                            <div className="text-sm text-zinc-400">Next Milestone</div>
                            <div className="mt-1 text-lg font-semibold text-white">
                                {data.badgeSummary.nextBadgeLabel ?? "Keep going"}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-zinc-950 p-4">
                            <div className="text-sm text-zinc-400">Certificate Status</div>
                            <div className="mt-1 text-lg font-semibold text-white">
                                {data.certificate.earned ? "Earned" : "Not yet earned"}
                            </div>
                            <div className="mt-2 text-sm text-zinc-400">
                                {data.certificate.completedRequired}/{data.certificate.totalRequired} required items complete
                            </div>
                        </div>
                    </div>
                </SectionCard>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <NotesCard
                    title="Lesson Notes"
                    value={lessonNotes}
                    emptyText="No lesson notes have been added yet."
                />

                <NotesCard
                    title="Rehearsal Notes"
                    value={rehearsalNotes}
                    emptyText="No rehearsal notes have been added yet."
                />
            </section>

            <SectionCard title="What’s Next">
                <div className="space-y-3">
                    {data.whatsNext.length ? (
                        data.whatsNext.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-2xl border border-zinc-800 p-4"
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
                        <div className="rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-300">
                            Everything currently tracked is complete.
                        </div>
                    )}
                </div>
            </SectionCard>
        </div>
    );
}