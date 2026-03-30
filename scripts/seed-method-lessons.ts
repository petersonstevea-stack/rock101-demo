/**
 * Seed script: method_lessons table
 * Run with: npx ts-node --project tsconfig.json scripts/seed-method-lessons.ts
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { allMethodLessons } from "../data/methodLessons";

// Load .env.local manually — no dotenv dependency needed
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

function deriveContentSource(description?: string): string {
    if (!description) return "rock101_original";
    if (description.startsWith("Bk")) return "book_only";
    return "rock101_original";
}

async function seed() {
    console.log(`Seeding ${allMethodLessons.length} lessons into method_lessons...`);

    const rows = allMethodLessons.map((lesson) => ({
        id: lesson.id,
        instrument: lesson.instrument,
        lesson_order: lesson.order,
        title: lesson.title,
        description: lesson.description ?? null,
        category: lesson.category,
        skill_group: lesson.skillGroup,
        content_source: deriveContentSource(lesson.description),
        method_app_id: lesson.externalId ?? null,
        content_url: null,
        is_active: lesson.isActive ?? true,
    }));

    const { data, error } = await supabase
        .from("method_lessons")
        .upsert(rows, { onConflict: "id" })
        .select("id");

    if (error) {
        console.error("Seed failed:", error.message);
        process.exit(1);
    }

    console.log(`Done. Rows upserted: ${data?.length ?? 0}`);
}

seed();
