"use client";

import { useState, useEffect } from "react";
import { fetchMethodLessonsWithMonths, type CurriculumItem } from "@/lib/curriculumQueries";
import ChecklistSection from "@/components/ChecklistSection";
import PageHero from "@/components/PageHero";

const ROCK101_MONTH_LABELS: Record<1 | 2 | 3 | 4, string> = {
    1: "Month 1 - Foundations",
    2: "Month 2 - Musical Skills",
    3: "Month 3 - Performance Readiness",
    4: "Month 4 - Graduation",
};

type LessonStudent = {
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

type PrivateLessonViewProps = {
    student: LessonStudent;
    onToggleDone: (item: string) => void;
    onToggleSigned: (item: string) => void;
    canEdit: boolean;
    canSign: boolean;
};

type MonthGroup = {
    month: 1 | 2 | 3 | 4;
    title: string;
    requiredLessonItems: CurriculumItem[];
};

function groupMethodLessonsByMonth(items: CurriculumItem[]): MonthGroup[] {
    const monthGroups: MonthGroup[] = ([1, 2, 3, 4] as const).map((month) => ({
        month,
        title: ROCK101_MONTH_LABELS[month],
        requiredLessonItems: [],
    }));

    items.forEach((item) => {
        if (item.location !== "privateLesson") return;
        if (item.area !== "requiredLessons") return;

        const month = item.month ?? 4;
        const targetGroup = monthGroups.find((group) => group.month === month);
        if (!targetGroup) return;

        targetGroup.requiredLessonItems.push(item);
    });

    return monthGroups.filter((group) => group.requiredLessonItems.length > 0);
}

function splitIntoTwoColumns<T>(items: T[]) {
    const midpoint = Math.ceil(items.length / 2);

    return {
        left: items.slice(0, midpoint),
        right: items.slice(midpoint),
    };
}

function getCurrentMonth(
    monthGroups: MonthGroup[],
    curriculum: LessonStudent["curriculum"]
) {
    for (const group of monthGroups) {
        const completed = group.requiredLessonItems.filter(
            (item) => curriculum[item.id]?.signed
        );

        if (completed.length < group.requiredLessonItems.length) {
            return group.month;
        }
    }

    return monthGroups[monthGroups.length - 1]?.month;
}

function splitMonthTitle(title: string) {
    const [monthPart, descriptorPart] = title.split(" - ");
    return {
        monthPart: monthPart ?? title,
        descriptorPart: descriptorPart ?? "",
    };
}

export default function PrivateLessonView({
    student,
    onToggleDone,
    onToggleSigned,
    canEdit,
    canSign,
}: PrivateLessonViewProps) {
    const [allItems, setAllItems] = useState<CurriculumItem[]>([]);

    useEffect(() => {
        fetchMethodLessonsWithMonths(student.instrument).then(setAllItems);
    }, [student.instrument]);

    const monthGroups = groupMethodLessonsByMonth(allItems);
    const currentMonth = getCurrentMonth(monthGroups, student.curriculum);

    return (
        <div className="min-h-screen bg-white">
        <div className="pt-6 px-6 pb-6 space-y-6">
            <PageHero
                title="Private Lesson"
                subtitle={`Focused skill-building for ${student.name} • ${student.instrument}`}
                imageSrc="/images/rock101-drums.jpg"
            />

            <div className="space-y-10">
                {monthGroups.map((group) => {
                    const columns = splitIntoTwoColumns(group.requiredLessonItems);
                    const { monthPart, descriptorPart } = splitMonthTitle(group.title);
                    const completedCount = group.requiredLessonItems.filter(
                        (item) => student.curriculum[item.id]?.signed
                    ).length;

                    const percent =
                        group.requiredLessonItems.length > 0
                            ? Math.round(
                                (completedCount / group.requiredLessonItems.length) * 100
                            )
                            : 0;

                    return (
                        <div
                            key={group.month}
                            className="space-y-5"
                        >
                            <div className="bg-[#111111] rounded-none p-5">
                                <div>
                                    <h2 className="sor-display text-4xl leading-none md:text-5xl">
                                        <span className="sor-display-red">{monthPart}</span>

                                        {descriptorPart && (
                                            <span className="ml-2 text-white italic opacity-80">
                                                {descriptorPart}
                                            </span>
                                        )}
                                    </h2>

                                    <div className="sor-divider" />

                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
                                            Month Progress
                                        </div>
                                        <div className="text-sm font-semibold text-red-300">
                                            {percent}%
                                        </div>
                                    </div>

                                    <div className="mt-2 h-3 overflow-hidden rounded-none bg-[#333333]">
                                        <div
                                            className="h-full transition-all"
                                            style={{
                                                width: `${percent}%`,
                                                backgroundColor: "var(--sor-red)"
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-6 xl:grid-cols-2">
                                {columns.left.length > 0 && (
                                    <div className="rounded-none border border-zinc-800 bg-zinc-900 p-1">
                                        <ChecklistSection
                                            title="Rock 101 Method App Lessons"
                                            items={columns.left}
                                            curriculum={student.curriculum}
                                            onToggleDone={onToggleDone}
                                            onToggleSigned={onToggleSigned}
                                            canEdit={canEdit}
                                            canSign={canSign}
                                            showHeader={false}
                                        />
                                    </div>
                                )}

                                {columns.right.length > 0 && (
                                    <div className="rounded-none border border-zinc-800 bg-zinc-900 p-1">
                                        <ChecklistSection
                                            title="Rock 101 Method App Lessons"
                                            items={columns.right}
                                            curriculum={student.curriculum}
                                            onToggleDone={onToggleDone}
                                            onToggleSigned={onToggleSigned}
                                            canEdit={canEdit}
                                            canSign={canSign}
                                            showHeader={false}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
        </div>
    );
}
