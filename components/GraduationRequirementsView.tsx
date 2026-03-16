"use client";

import {
  getAllCurriculumItems,
  ROCK101_MONTH_LABELS,
} from "@/data/rock101Curriculum";
import ChecklistSection from "@/components/ChecklistSection";
import PageHero from "@/components/PageHero";

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
      fistBumps: number;
    }
  >;
};

type GraduationRequirementsViewProps = {
  student: LessonStudent;
  onToggleDone: (item: string) => void;
  onToggleSigned: (item: string) => void;
  canEdit: boolean;
  canSign: boolean;
};

type LessonItem = {
  id: string;
  label: string;
  description?: string;
  area: "graduation" | "requiredLessons" | "rehearsalReadiness";
  location: "privateLesson" | "groupRehearsal";
  allowedSigner: "instructor" | "director" | "either";
  required: boolean;
  month?: 1 | 2 | 3 | 4;
};

type MonthGroup = {
  month: 1 | 2 | 3 | 4;
  title: string;
  graduationItems: LessonItem[];
};

function groupGraduationByMonth(items: LessonItem[]): MonthGroup[] {
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
  onToggleDone,
  onToggleSigned,
  canEdit,
  canSign,
}: GraduationRequirementsViewProps) {
  const allItems = getAllCurriculumItems(student.instrument) as LessonItem[];
  const monthGroups = groupGraduationByMonth(allItems);
  const currentMonth = getCurrentGraduationMonth(
    monthGroups,
    student.curriculum
  );

  return (
    <div className="mt-8 space-y-6">
      <PageHero
        title="Graduation Requirements"
        subtitle={`Rock 101 graduation skills for ${student.name}`}
        imageSrc="/images/rock101-drums.jpg"
      />

      <div className="space-y-10">
        {monthGroups.map((group) => {
          const { monthPart, descriptorPart } = splitMonthTitle(group.title);

          return (
            <div
              key={group.month}
              className={`space-y-5 ${
                group.month === currentMonth
                  ? "ring-2 ring-[var(--sor-red)] ring-offset-2 ring-offset-black rounded-xl p-2"
                  : ""
              }`}
            >
              <div className="sor-finish-card rounded-2xl p-5">
                <div>
                  <h2 className="sor-display text-4xl md:text-5xl leading-none">
                    <span className="sor-display-red">{monthPart}</span>

                    {descriptorPart && (
                      <span className="ml-2 text-white italic opacity-80">
                        {descriptorPart}
                      </span>
                    )}
                  </h2>

                  <div className="sor-divider" />
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/82 p-1 backdrop-blur-sm">
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
  );
}