/**
 * Seed script: rock101_graduation_requirements, rock101_rehearsal_behaviors,
 * and rock101_method_lesson_months tables.
 *
 * Run with: npx tsx scripts/seed-rock101-curriculum.ts
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { rock101Curriculum } from "../data/rock101Curriculum";
import { allMethodLessons } from "../data/methodLessons";

// Load .env.local manually
const envPath = path.resolve(__dirname, "../.env.local");
const envLines = fs.readFileSync(envPath, "utf-8").split("\n");
for (const line of envLines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// ─── 1. rock101_graduation_requirements ───────────────────────────────────────

async function seedGraduationRequirements() {
    const rows: object[] = [];

    for (const curriculum of Object.values(rock101Curriculum)) {
        for (const section of curriculum.graduationRequirements) {
            section.items.forEach((item, index) => {
                rows.push({
                    id: item.id,
                    instrument: curriculum.instrument,
                    label: item.label,
                    allowed_signer: item.allowedSigner,
                    required: item.required,
                    month: item.month ?? null,
                    sort_order: index + 1,
                });
            });
        }
    }

    const { data, error } = await supabase
        .from("rock101_graduation_requirements")
        .upsert(rows, { onConflict: "id" })
        .select("id");

    if (error) {
        console.error("rock101_graduation_requirements seed failed:", error.message);
        process.exit(1);
    }

    console.log(`rock101_graduation_requirements: ${data?.length ?? 0} rows upserted`);
    return data?.length ?? 0;
}

// ─── 2. rock101_rehearsal_behaviors ───────────────────────────────────────────

async function seedRehearsalBehaviors() {
    // sharedRehearsalReadiness is instrument-agnostic — seed once from any instrument
    const rehearsalSections = rock101Curriculum.guitar.rehearsalReadiness;
    const rows: object[] = [];

    for (const section of rehearsalSections) {
        section.items.forEach((item, index) => {
            rows.push({
                id: item.id,
                label: item.label,
                required: item.required,
                month: item.month ?? null,
                sort_order: index + 1,
            });
        });
    }

    const { data, error } = await supabase
        .from("rock101_rehearsal_behaviors")
        .upsert(rows, { onConflict: "id" })
        .select("id");

    if (error) {
        console.error("rock101_rehearsal_behaviors seed failed:", error.message);
        process.exit(1);
    }

    console.log(`rock101_rehearsal_behaviors: ${data?.length ?? 0} rows upserted`);
    return data?.length ?? 0;
}

// ─── 3. rock101_method_lesson_months ──────────────────────────────────────────

// Replicates the normalizeTitle logic from rock101Curriculum.ts
function normalizeTitle(value: string) {
    return value.replace(/\s+/g, " ").trim().toLowerCase();
}

// methodLessonMonthMap is not exported, so we reconstruct the month assignment
// by replicating the same lookup logic used in getMethodLessonMonth()
const INSTRUMENTS = ["guitar", "bass", "drums", "keys", "vocals"] as const;

// We pull the month map data from the curriculum by reading requiredLessons items
// which already have month assigned via buildRequiredMethodLessonItems()
async function seedMethodLessonMonths() {
    const rows: object[] = [];
    const seenLessonIds = new Set<string>();

    for (const instrument of INSTRUMENTS) {
        const curriculum = rock101Curriculum[instrument];
        for (const section of curriculum.requiredLessons) {
            for (const item of section.items) {
                // item.id is the method_lessons id; item.month is already resolved
                if (!seenLessonIds.has(item.id)) {
                    seenLessonIds.add(item.id);
                    rows.push({
                        lesson_id: item.id,
                        month: item.month ?? 4,
                    });
                }
            }
        }
    }

    // Verify all lesson_ids exist in method_lessons before upserting
    const lessonIds = rows.map((r: any) => r.lesson_id);
    const { data: existing, error: lookupError } = await supabase
        .from("method_lessons")
        .select("id")
        .in("id", lessonIds);

    if (lookupError) {
        console.error("method_lessons lookup failed:", lookupError.message);
        process.exit(1);
    }

    const existingIds = new Set((existing ?? []).map((r: any) => r.id));
    const missing = lessonIds.filter((id) => !existingIds.has(id));
    if (missing.length > 0) {
        console.warn(`Warning: ${missing.length} lesson_ids not found in method_lessons:`, missing.slice(0, 5));
    }

    const validRows = rows.filter((r: any) => existingIds.has(r.lesson_id));

    const { data, error } = await supabase
        .from("rock101_method_lesson_months")
        .upsert(validRows, { onConflict: "lesson_id" })
        .select("lesson_id");

    if (error) {
        console.error("rock101_method_lesson_months seed failed:", error.message);
        process.exit(1);
    }

    console.log(`rock101_method_lesson_months: ${data?.length ?? 0} rows upserted`);
    return data?.length ?? 0;
}

// ─── Run all ───────────────────────────────────────────────────────────────────

async function seed() {
    console.log("Seeding rock101 curriculum tables...\n");
    await seedGraduationRequirements();
    await seedRehearsalBehaviors();
    await seedMethodLessonMonths();
    console.log("\nDone.");
}

seed();
