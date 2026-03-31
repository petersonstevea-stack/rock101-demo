"use client";

import { useState, useEffect } from "react";
import { fetchGraduationRequirements, type CurriculumItem } from "@/lib/curriculumQueries";
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
};
type GraduationWorkflowState = {
    graduationInstructorSubmitted: boolean;
    graduationDirectorSubmitted: boolean;
};
type GraduationRequirementsViewProps = {
    student: LessonStudent;
    workflow: GraduationWorkflowState;
    onToggleDone: (item: string) => void;
    onToggleSigned: (item: string) => void;
    onInstructorGraduationSubmit: () => void;
    onDirectorGraduationSubmit: () => void;
    canInstructorGraduationSubmit: boolean;
    canDirectorGraduationSubmit: boolean;
    canEdit: boolean;
    canSign: boolean;
};
type MonthGroup = {
    month: 1 | 2 | 3 | 4;
    title: string;
    graduationItems: CurriculumItem[];
};

function groupGraduationByMonth(items: CurriculumItem[]): MonthGroup[] {
    const months: MonthGroup[] = ([1, 2, 3, 4] as const).map((month) => ({
        month,
        title: ROCK101_MONTH_LABELS[month],
        graduationItems: [],
    }));

    items.forEach((item) => {
        if (item.area !== "graduation") return;
        if (item.location !== "privateLesson") return;

        const month = item.month ?? 4;
        const group = months.find((m) => m.month === month);

        if (!group) return;

        group.graduationItems.push(item);
    });

    return months.filter((m) => m.graduationItems.length > 0);
}

function getCurrentGraduationMonth(
    monthGroups: MonthGroup[],
    curriculum: LessonStudent["curriculum"]
) {
    for (const group of monthGroups) {
        const completed = group.graduationItems.filter(
            (item) => curriculum[item.id]?.signed
        );

        if (completed.length < group.graduationItems.length) {
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

export default function GraduationRequirementsView({
    student,
    workflow,
    onToggleDone,
    onToggleSigned,
    onInstructorGraduationSubmit,
    onDirectorGraduationSubmit,
    canInstructorGraduationSubmit,
    canDirectorGraduationSubmit,
    canEdit,
    canSign,
}: GraduationRequirementsViewProps) {
    const [allItems, setAllItems] = useState<CurriculumItem[]>([]);

    useEffect(() => {
        fetchGraduationRequirements(student.instrument).then(setAllItems);
    }, [student.instrument]);

    const monthGroups = groupGraduationByMonth(allItems);
    const currentMonth = getCurrentGraduationMonth(
        monthGroups,
        student.curriculum
    );

    return (
        <div className="min-h-screen bg-white">
        <div className="p-6 space-y-6">
            <PageHero
                title="Graduation Requirements"
                subtitle={`Rock 101 graduation skills for ${student.name}`}
                imageSrc="/images/rock101-drums.jpg"
            />
            <div className="rounded-none bg-[#111111] p-4">
                <h3 className="text-lg font-semibold text-white">
                    Graduation Workflow Status
                </h3>

                <div className="mt-3 space-y-2 text-sm text-zinc-300">
                    <div>
                        Instructor graduation signoff:{" "}
                        <span className="font-medium text-white">
                            {workflow.graduationInstructorSubmitted ? "Submitted" : "Not submitted"}
                        </span>
                    </div>
                    <div>
                        Class Instructor graduation signoff:{" "}
                        <span className="font-medium text-white">
                            {workflow.graduationDirectorSubmitted ? "Submitted" : "Not submitted"}
                        </span>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={onInstructorGraduationSubmit}
                        disabled={
                            workflow.graduationInstructorSubmitted || !canInstructorGraduationSubmit
                        }
                        className={`rounded-none px-4 py-2 font-medium text-white ${workflow.graduationInstructorSubmitted || !canInstructorGraduationSubmit
                            ? "bg-zinc-700 cursor-not-allowed"
                            : "hover:bg-[#b30000]"
                            }`}
                        style={
                            !(workflow.graduationInstructorSubmitted || !canInstructorGraduationSubmit)
                                ? { backgroundColor: "#cc0000" }
                                : undefined
                        }
                    >
                        {workflow.graduationInstructorSubmitted
                            ? "Instructor Signoff Complete"
                            : "Instructor Graduation Signoff"}
                    </button>

                    <button
                        type="button"
                        onClick={onDirectorGraduationSubmit}
                        disabled={
                            workflow.graduationDirectorSubmitted || !canDirectorGraduationSubmit
                        }
                        className={`rounded-none px-4 py-2 font-medium text-white ${workflow.graduationDirectorSubmitted || !canDirectorGraduationSubmit
                            ? "bg-zinc-700 cursor-not-allowed"
                            : "hover:bg-[#b30000]"
                            }`}
                        style={
                            !(workflow.graduationDirectorSubmitted || !canDirectorGraduationSubmit)
                                ? { backgroundColor: "#cc0000" }
                                : undefined
                        }
                    >
                        {workflow.graduationDirectorSubmitted
                            ? "Class Instructor Signoff Complete"
                            : "Class Instructor Graduation Signoff"}
                    </button>
                </div>
            </div>
            <div className="space-y-10">
                {monthGroups.map((group) => {
                    const { monthPart, descriptorPart } = splitMonthTitle(group.title);

                    return (
                        <div key={group.month} className="space-y-5">
                            <div className="bg-[#111111] rounded-none p-5">
                                <div>
                                    <h2 className="sor-display text-4xl md:text-5xl leading-none">
                                        <span style={{ color: "#cc0000" }}>{monthPart}</span>

                                        {descriptorPart && (
                                            <span className="ml-2 text-white italic">
                                                {descriptorPart}
                                            </span>
                                        )}
                                    </h2>

                                    <div className="sor-divider" />
                                </div>
                            </div>

                            <div className="rounded-none border border-zinc-800 bg-zinc-900 p-1">
                                <ChecklistSection
                                    title="Graduation Requirements"
                                    items={group.graduationItems}
                                    curriculum={student.curriculum}
                                    onToggleDone={onToggleDone}
                                    onToggleSigned={onToggleSigned}
                                    canEdit={canEdit}
                                    canSign={canSign}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
        </div>
    );
}