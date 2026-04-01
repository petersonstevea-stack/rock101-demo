import { supabase } from "@/lib/supabaseClient";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type CurriculumArea = "graduation" | "requiredLessons" | "rehearsalReadiness";
export type CurriculumLocation = "privateLesson" | "groupRehearsal";
export type AllowedSigner = "instructor" | "director" | "either";
export type CurriculumMonth = 1 | 2 | 3 | 4;

export type CurriculumItem = {
    id: string;
    label: string;
    description?: string;
    area: CurriculumArea;
    location: CurriculumLocation;
    allowedSigner: AllowedSigner;
    required: boolean;
    month?: CurriculumMonth;
    monthLabel?: string;
    requiredHighFives?: number;
};

export const ROCK101_MONTH_LABELS: Record<CurriculumMonth, string> = {
    1: "Month 1 - Foundations",
    2: "Month 2 - Musical Skills",
    3: "Month 3 - Performance Readiness",
    4: "Month 4 - Graduation",
};

// ─── Query functions ───────────────────────────────────────────────────────────

/**
 * Replaces getPrivateLessonSections(instrument) for graduation items.
 * Queries rock101_graduation_requirements for the given instrument.
 */
export async function fetchGraduationRequirements(instrument: string): Promise<CurriculumItem[]> {
    const { data, error } = await supabase
        .from("rock101_graduation_requirements")
        .select("id, label, allowed_signer, required, month")
        .eq("instrument", instrument.toLowerCase())
        .order("month", { ascending: true, nullsFirst: false })
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("fetchGraduationRequirements error:", error.message);
        return [];
    }

    return (data ?? []).map((row) => ({
        id: row.id,
        label: row.label,
        area: "graduation" as const,
        location: "privateLesson" as const,
        allowedSigner: (row.allowed_signer ?? "instructor") as AllowedSigner,
        required: row.required,
        month: (row.month ?? undefined) as CurriculumMonth | undefined,
        monthLabel: row.month ? ROCK101_MONTH_LABELS[row.month as CurriculumMonth] : undefined,
    }));
}

/**
 * Replaces getGroupRehearsalSections(instrument).
 * Rehearsal behaviors are shared across all instruments — no instrument arg needed.
 */
export async function fetchRehearsalBehaviors(): Promise<CurriculumItem[]> {
    const { data, error } = await supabase
        .from("rock101_rehearsal_behaviors")
        .select("id, label, required, month, required_high_fives")
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("fetchRehearsalBehaviors error:", error.message);
        return [];
    }

    return (data ?? []).map((row) => ({
        id: row.id,
        label: row.label,
        area: "rehearsalReadiness" as const,
        location: "groupRehearsal" as const,
        allowedSigner: "director" as const,
        required: row.required,
        month: (row.month ?? undefined) as CurriculumMonth | undefined,
        monthLabel: row.month ? ROCK101_MONTH_LABELS[row.month as CurriculumMonth] : undefined,
        requiredHighFives: row.required_high_fives ?? 10,
    }));
}

/**
 * Replaces the requiredLessons portion of getPrivateLessonSections(instrument).
 * Queries method_lessons joined with rock101_method_lesson_months.
 */
export async function fetchMethodLessonsWithMonths(instrument: string): Promise<CurriculumItem[]> {
    const { data: lessons, error: lessonsError } = await supabase
        .from("method_lessons")
        .select("id, title, lesson_order")
        .eq("instrument", instrument.toLowerCase())
        .eq("is_active", true)
        .order("lesson_order", { ascending: true });

    if (lessonsError) {
        console.error("fetchMethodLessonsWithMonths lessons error:", lessonsError.message);
        return [];
    }

    if (!lessons || lessons.length === 0) return [];

    const lessonIds = lessons.map((l) => l.id);

    const { data: monthRows, error: monthsError } = await supabase
        .from("rock101_method_lesson_months")
        .select("lesson_id, month")
        .in("lesson_id", lessonIds);

    if (monthsError) {
        console.error("fetchMethodLessonsWithMonths months error:", monthsError.message);
        return [];
    }

    const monthMap = new Map((monthRows ?? []).map((r) => [r.lesson_id, r.month as CurriculumMonth]));

    return lessons.map((lesson) => {
        const month = monthMap.get(lesson.id) ?? 4;
        return {
            id: lesson.id,
            label: lesson.title,
            area: "requiredLessons" as const,
            location: "privateLesson" as const,
            allowedSigner: "instructor" as const,
            required: true,
            month,
            monthLabel: ROCK101_MONTH_LABELS[month],
        };
    });
}

/**
 * Replaces getAllCurriculumItems(instrument).
 * Returns all graduation, requiredLessons, and rehearsalReadiness items combined.
 */
export async function fetchAllCurriculumItems(instrument: string): Promise<CurriculumItem[]> {
    const [graduationItems, methodLessons, rehearsalItems] = await Promise.all([
        fetchGraduationRequirements(instrument),
        fetchMethodLessonsWithMonths(instrument),
        fetchRehearsalBehaviors(),
    ]);

    return [...graduationItems, ...methodLessons, ...rehearsalItems];
}
