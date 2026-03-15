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
    badges?: Badge[];
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
    progress.fistBumps >= FIST_BUMPS_TO_EARN
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

function getCertificateStatus(
  privateLessonItems: CurriculumItem[],
  groupRehearsalItems: CurriculumItem[],
  curriculum: CurriculumProgressRecord
) {
  const allRequiredItems = [
    ...privateLessonItems,
    ...groupRehearsalItems,
  ].filter((item) => item.required);

  const totalRequired = allRequiredItems.length;

  const completedRequired = allRequiredItems.filter((item) =>
    isItemEarned(item, curriculum[item.id])
  ).length;

  const earned = totalRequired > 0 && completedRequired === totalRequired;

  return {
    earned,
    completedRequired,
    totalRequired,
    label: earned ? "Certificate Earned" : "Certificate In Progress",
    description: earned
      ? "Your student has completed all graduation requirements, Rock 101 Method App lessons, and rehearsal readiness items."
      : "The certificate is earned once all graduation requirements, Rock 101 Method App lessons, and rehearsal readiness items are checked off.",
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
        .filter((item) => !curriculum[item.id]?.done && !curriculum[item.id]?.signed)
        .slice(0, 2)
        .map((item) => ({
            id: `next-${item.id}`,
            label: item.label,
            description: item.description,
            area: "privateLesson" as const,
            priority: item.required ? ("high" as const) : ("medium" as const),
        }));

    const remainingGroup = groupRehearsalItems
        .filter((item) => !curriculum[item.id]?.done && !curriculum[item.id]?.signed)
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

function getRehearsalReadiness(
    groupProgressPercent: number,
    privateProgressPercent: number
) {
    const ready = groupProgressPercent >= 80 && privateProgressPercent >= 70;

    if (ready) {
        return {
            ready: true,
            label: "Rehearsal Ready",
            description:
                "Your student is on track and looking prepared for rehearsal.",
        };
    }

    if (groupProgressPercent < 80) {
        return {
            ready: false,
            label: "Needs Rehearsal Focus",
            description:
                "A few group rehearsal skills still need attention before full readiness.",
        };
    }

    return {
        ready: false,
        label: "Needs Lesson Follow-Through",
        description:
            "Private lesson progress is still catching up to rehearsal progress.",
    };
}

export function buildParentDashboardData({
    student,
    curriculum,
    privateLessonItems,
    groupRehearsalItems,
    badges = [],
}: BuildParentDashboardArgs): ParentDashboardData {
    const privateLessons = countCompleted(privateLessonItems, curriculum);
    const groupRehearsal = countCompleted(groupRehearsalItems, curriculum);
    const certificate = getCertificateStatus(
        privateLessonItems,
        groupRehearsalItems,
        curriculum
    );

    const totalCompleted =
        privateLessons.completed + groupRehearsal.completed;

    const totalPossible =
        privateLessons.total + groupRehearsal.total;

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

    const rehearsalReady = getRehearsalReadiness(
        groupRehearsal.percent,
        privateLessons.percent
    );

    const nextBadge = badges.find((badge) => !badge.earned);

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
        stats: {
            privateLessons: {
                label: "Private Lessons",
                value: `${privateLessons.percent}%`,
                sublabel: `${privateLessons.completed}/${privateLessons.total} complete`,
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
            privateLessons,
            groupRehearsal,
        },
        rehearsalReady,
        certificate,
        badgeSummary: {
            earned: badgesEarned,
            available: badges.length,
            nextBadgeLabel: nextBadge?.label,
        },
        recentActivity,
        whatsNext,
    };
}