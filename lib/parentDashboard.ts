import type {
    ParentDashboardData,
    ActivityItem,
    WhatsNextItem,
} from "@/types/parent-dashboard";

type CurriculumProgressRecord = Record<
    string,
    {
        done: boolean;
        signed: boolean;
        date: string | null;
        fistBumps: number;
    }
>;

type CurriculumItem = {
    id: string;
    label: string;
    description?: string;
    area?: string;
    location?: string;
    required?: boolean;
};

type Badge = {
    id: string;
    label: string;
    earned?: boolean;
};

type BuildParentDashboardArgs = {
    student: {
        id: string;
        name: string;
        instrument?: string;
        className?: string;
        schoolName?: string;
        nextPerformanceDate?: string | null;
    };
    curriculum: CurriculumProgressRecord;
    privateLessonItems: CurriculumItem[];
    groupRehearsalItems: CurriculumItem[];
    songProgress?: {
        song: string;
        readiness: 1 | 2 | 3 | 4 | 5;
        label: string;
    }[];
    badges?: Badge[];
    classFeedback?: string | null;
};

function clampPercent(value: number) {
    if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
}

const FIST_BUMPS_TO_EARN = 10;

function isItemEarned(
    item: CurriculumItem,
    progress?: {
        done: boolean;
        signed: boolean;
        date: string | null;
        fistBumps: number;
    }
) {
    if (!progress) return false;

    if (
        item.location === "groupRehearsal" &&
        (progress.fistBumps ?? 0) >= FIST_BUMPS_TO_EARN
    ) {
        return true;
    }

    return Boolean(progress.done || progress.signed);
}

function countCompleted(
    items: CurriculumItem[],
    curriculum: CurriculumProgressRecord
) {
    const completed = items.filter((item) =>
        isItemEarned(item, curriculum[item.id])
    ).length;

    return {
        completed,
        total: items.length,
        percent: items.length
            ? clampPercent((completed / items.length) * 100)
            : 0,
    };
}

function normalizeArea(area?: string) {
    const value = String(area ?? "").toLowerCase();

    if (
        value === "graduation" ||
        value === "graduationrequirements" ||
        value === "graduation_requirements"
    ) {
        return "graduation";
    }

    if (
        value === "requiredlessons" ||
        value === "methodapplessons" ||
        value === "rock101methodapplessons" ||
        value === "methodapp"
    ) {
        return "method";
    }

    if (
        value === "rehearsalreadiness" ||
        value === "rehearsal_readiness"
    ) {
        return "rehearsal";
    }

    return "unknown";
}

function getCertificateStatus(
    privateLessonItems: CurriculumItem[],
    groupRehearsalItems: CurriculumItem[],
    curriculum: CurriculumProgressRecord
) {
    const allRequiredItems = [...privateLessonItems, ...groupRehearsalItems].filter(
        (item) => item.required
    );

    const totalRequired = allRequiredItems.length;

    const completedRequired = allRequiredItems.filter((item) =>
        isItemEarned(item, curriculum[item.id])
    ).length;

    const earned = totalRequired > 0 && completedRequired === totalRequired;
    const percent = totalRequired
        ? clampPercent((completedRequired / totalRequired) * 100)
        : 0;

    return {
        earned,
        completedRequired,
        totalRequired,
        percent,
        label: earned ? "Certificate Earned" : "Certificate In Progress",
        description: earned
            ? "Your student has completed all graduation requirements, Rock 101 Method App lessons, and rehearsal readiness items."
            : "The certificate is earned once all graduation requirements, Rock 101 Method App lessons, and rehearsal readiness items are complete.",
    };
}

function getFistBumps(curriculum: CurriculumProgressRecord) {
    return Object.values(curriculum).reduce(
        (sum, item) => sum + (item?.fistBumps ?? 0),
        0
    );
}

function buildRecentActivity(
    curriculum: CurriculumProgressRecord,
    privateLessonItems: CurriculumItem[],
    groupRehearsalItems: CurriculumItem[],
    badges: Badge[]
): ActivityItem[] {
    const itemMap = new Map<string, CurriculumItem>();

    [...privateLessonItems, ...groupRehearsalItems].forEach((item) => {
        itemMap.set(item.id, item);
    });

    const progressActivities: ActivityItem[] = Object.entries(curriculum)
        .filter(([, value]) => value?.done || value?.signed || value?.date)
        .map(([itemId, value]) => {
            const item = itemMap.get(itemId);
            const isGroup = item?.location === "groupRehearsal";

            return {
                id: `activity-${itemId}`,
                type: isGroup ? "groupRehearsal" : "privateLesson",
                title: item?.label ?? itemId,
                description: value?.signed
                    ? "Signed off by staff"
                    : value?.done
                        ? "Completed"
                        : "Progress updated",
                dateLabel: value?.date ?? "Recently",
            };
        });

    const badgeActivities: ActivityItem[] = badges
        .filter((badge) => badge.earned)
        .slice(0, 3)
        .map((badge) => ({
            id: `badge-${badge.id}`,
            type: "badge",
            title: `Badge earned: ${badge.label}`,
            description: "Great progress milestone",
            dateLabel: "Recently",
        }));

    return [...progressActivities, ...badgeActivities]
        .sort((a, b) => {
            if (a.dateLabel === "Recently" && b.dateLabel !== "Recently") return -1;
            if (a.dateLabel !== "Recently" && b.dateLabel === "Recently") return 1;
            return String(b.dateLabel).localeCompare(String(a.dateLabel));
        })
        .slice(0, 6);
}

function buildWhatsNext(
    curriculum: CurriculumProgressRecord,
    privateLessonItems: CurriculumItem[],
    groupRehearsalItems: CurriculumItem[]
): WhatsNextItem[] {
    const remainingPrivate = privateLessonItems
        .filter((item) => !isItemEarned(item, curriculum[item.id]))
        .slice(0, 2)
        .map((item) => ({
            id: `next-${item.id}`,
            label: item.label,
            description: item.description,
            area: "privateLesson" as const,
            priority: item.required ? ("high" as const) : ("medium" as const),
        }));

    const remainingGroup = groupRehearsalItems
        .filter((item) => !isItemEarned(item, curriculum[item.id]))
        .slice(0, 2)
        .map((item) => ({
            id: `next-${item.id}`,
            label: item.label,
            description: item.description,
            area: "groupRehearsal" as const,
            priority: item.required ? ("high" as const) : ("medium" as const),
        }));

    return [...remainingPrivate, ...remainingGroup]
        .sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 };
            return order[a.priority] - order[b.priority];
        })
        .slice(0, 5);
}

function getRehearsalReady(
    rehearsalReadinessPercent: number,
    methodAppLessonsPercent: number
) {
    const ready =
        rehearsalReadinessPercent >= 80 && methodAppLessonsPercent >= 70;

    if (ready) {
        return {
            ready: true,
            label: "Rehearsal Ready",
            description:
                "Your student is on track and looking prepared for rehearsal.",
        };
    }

    if (rehearsalReadinessPercent < 80) {
        return {
            ready: false,
            label: "Needs Rehearsal Focus",
            description:
                "A few rehearsal-readiness skills still need attention before full readiness.",
        };
    }

    return {
        ready: false,
        label: "Needs Lesson Follow-Through",
        description:
            "Method App lesson progress is still catching up to rehearsal progress.",
    };
}

function parseDateValue(dateLabel: string | null | undefined) {
    if (!dateLabel) return Number.NaN;

    const parsed = new Date(dateLabel).getTime();
    if (!Number.isNaN(parsed)) return parsed;

    return Number.NaN;
}

function getLatestDateLabel(
    items: CurriculumItem[],
    curriculum: CurriculumProgressRecord
) {
    let latestLabel: string | null = null;
    let latestTime = -Infinity;

    items.forEach((item) => {
        const dateLabel = curriculum[item.id]?.date;
        if (!dateLabel) return;

        const time = parseDateValue(dateLabel);
        if (Number.isNaN(time)) {
            if (!latestLabel) {
                latestLabel = dateLabel;
            }
            return;
        }

        if (time > latestTime) {
            latestTime = time;
            latestLabel = dateLabel;
        }
    });

    return latestLabel;
}

function buildSummaryText(args: {
    studentName: string;
    certificateEarned: boolean;
    certificatePercent: number;
    graduationRequirementsPercent: number;
    methodAppLessonsPercent: number;
    rehearsalReadinessPercent: number;
    whatsNext: WhatsNextItem[];
}) {
    const {
        studentName,
        certificateEarned,
        certificatePercent,
        graduationRequirementsPercent,
        methodAppLessonsPercent,
        rehearsalReadinessPercent,
        whatsNext,
    } = args;

    if (certificateEarned) {
        return `${studentName} has completed the Rock 101 certificate requirements and is ready for the next stage. Keep reinforcing those skills through continued private lesson practice and confident rehearsal participation.`;
    }

    const lowestBucket = [
        {
            label: "graduation requirements",
            percent: graduationRequirementsPercent,
        },
        {
            label: "Rock 101 Method App lessons",
            percent: methodAppLessonsPercent,
        },
        {
            label: "rehearsal readiness",
            percent: rehearsalReadinessPercent,
        },
    ].sort((a, b) => a.percent - b.percent)[0];

    const nextItem = whatsNext[0];

    if (nextItem) {
        return `${studentName} is ${certificatePercent}% of the way toward the Rock 101 certificate. The biggest current opportunity is ${lowestBucket.label}. Next up is "${nextItem.label}" to help keep progress moving forward.`;
    }

    return `${studentName} is ${certificatePercent}% of the way toward the Rock 101 certificate and is making steady progress across graduation requirements, Method App lessons, and rehearsal readiness.`;
}

export function buildParentDashboardData({
    student,
    curriculum,
    privateLessonItems,
    groupRehearsalItems,
    songProgress = [],
    badges = [],
    classFeedback = null,
}: BuildParentDashboardArgs): ParentDashboardData {
    const graduationRequirementItems = privateLessonItems.filter(
        (item) => normalizeArea(item.area) === "graduation"
    );

    const methodAppLessonItems = privateLessonItems.filter(
        (item) => normalizeArea(item.area) === "method"
    );

    const rehearsalReadinessItems = groupRehearsalItems.filter(
        (item) => normalizeArea(item.area) === "rehearsal"
    );

    const privateLessons = countCompleted(privateLessonItems, curriculum);
    const groupRehearsal = countCompleted(groupRehearsalItems, curriculum);
    const graduationRequirements = countCompleted(
        graduationRequirementItems,
        curriculum
    );
    const methodAppLessons = countCompleted(methodAppLessonItems, curriculum);
    const rehearsalReadiness = countCompleted(
        rehearsalReadinessItems,
        curriculum
    );

    const certificate = getCertificateStatus(
        privateLessonItems,
        groupRehearsalItems,
        curriculum
    );

    const totalCompleted = privateLessons.completed + groupRehearsal.completed;
    const totalPossible = privateLessons.total + groupRehearsal.total;

    const overallProgressPercent = totalPossible
        ? clampPercent((totalCompleted / totalPossible) * 100)
        : 0;

    const fistBumps = getFistBumps(curriculum);
    const badgesEarned = badges.filter((badge) => badge.earned).length;

    const recentActivity = buildRecentActivity(
        curriculum,
        privateLessonItems,
        groupRehearsalItems,
        badges
    );

    const whatsNext = buildWhatsNext(
        curriculum,
        privateLessonItems,
        groupRehearsalItems
    );

    const rehearsalReady = getRehearsalReady(
        rehearsalReadiness.percent,
        methodAppLessons.percent
    );

    const nextBadge = badges.find((badge) => !badge.earned);

    const lessonLastUpdated = getLatestDateLabel(privateLessonItems, curriculum);
    const rehearsalLastUpdated = getLatestDateLabel(
        groupRehearsalItems,
        curriculum
    );
const today = new Date();

let rehearsalsToShow: number | null = null;

if (student.nextPerformanceDate) {
    const showDate = new Date(student.nextPerformanceDate);
    const diffMs = showDate.getTime() - today.getTime();

    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // assume 1 rehearsal per week
    rehearsalsToShow = Math.max(0, Math.ceil(diffDays / 7));
}
    return {
    student: {
      id: student.id,
      name: student.name,
      instrument: student.instrument ?? "Instrument",
      className: student.className ?? "Rock 101",
      schoolName: student.schoolName ?? "School of Rock",
      nextPerformanceDate: student.nextPerformanceDate ?? null,
    },
    overallProgressPercent,
    rehearsalsToShow,
    stats: {
  privateLessons: {
    label: "Private Lessons",
    value: `${privateLessons.percent}%`,
    sublabel: `${privateLessons.completed}/${privateLessons.total} complete`,
  },
  graduationRequirements: {
    label: "Graduation Requirements",
    value: `${graduationRequirements.percent}%`,
    sublabel: `${graduationRequirements.completed}/${graduationRequirements.total} complete`,
  },
  groupRehearsal: {
    label: "Group Rehearsal",
    value: `${groupRehearsal.percent}%`,
    sublabel: `${groupRehearsal.completed}/${groupRehearsal.total} complete`,
  },
  badgesEarned: {
    label: "Badges Earned",
    value: `${badgesEarned}`,
    sublabel: `${badges.length} available`,
  },
  fistBumps: {
    label: "Fist Bumps",
    value: `${fistBumps}`,
    sublabel: "Positive rehearsal moments",
  },
},
    progress: {
  graduationRequirements: {
    label: "Graduation Requirements",
    completed: graduationRequirements.completed,
    total: graduationRequirements.total,
    percent: graduationRequirements.percent,
    targetTab: "privateLesson",
  },
  methodAppLessons: {
    label: "Rock 101 Method App Lessons",
    completed: methodAppLessons.completed,
    total: methodAppLessons.total,
    percent: methodAppLessons.percent,
    targetTab: "privateLesson",
  },
  rehearsalReadiness: {
    label: "Rehearsal Readiness",
    completed: rehearsalReadiness.completed,
    total: rehearsalReadiness.total,
    percent: rehearsalReadiness.percent,
    targetTab: "groupRehearsal",
  },
  certificate: {
    label: "Rock 101 Certificate",
    completed: certificate.completedRequired,
    total: certificate.totalRequired,
    percent: certificate.percent,
    targetTab: "certificate",
  },
},
songs: songProgress.map((item) => ({
  song: item.song,
  readiness: item.readiness,
  label: item.label,
  targetTab: "groupRehearsal",
})),
    rehearsalReady,
    certificate,
    badgeSummary: {
      earned: badgesEarned,
      available: badges.length,
      nextBadgeLabel: nextBadge?.label,
    },
        recentActivity,
    whatsNext,
    notesMeta: {
      lessonLastUpdated,
      rehearsalLastUpdated,
    },
    summary: {
      title: "Summary",
      text: buildSummaryText({
        studentName: student.name,
        certificateEarned: certificate.earned,
        certificatePercent: certificate.percent,
        graduationRequirementsPercent: graduationRequirements.percent,
        methodAppLessonsPercent: methodAppLessons.percent,
        rehearsalReadinessPercent: rehearsalReadiness.percent,
        whatsNext,
      }),
    },
    classFeedback,
  };
}