import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SCHOOL_SLUG = "del-mar";
const PIKE13_BASE = "https://delmar-sor.pike13.com";
const PIKE13_TOKEN = Deno.env.get("PIKE13_ACCESS_TOKEN")!;

const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ── Program detection ────────────────────────────────────────────────────────

function detectProgram(serviceName: string): string | null {
    const s = serviceName.toLowerCase();

    if (
        s.includes("camp") ||
        s.includes("workshop") ||
        s.includes("trial") ||
        s.includes("make up") ||
        s.includes("makeup") ||
        s.includes("admin") ||
        s.includes("front desk") ||
        s.includes("paid break") ||
        s.includes("repair") ||
        s.includes("birthday")
    ) {
        return null;
    }

    if (s.includes("seasonal") || s.includes("show rehearsal") || s.includes("house band")) {
        return "performance_program";
    }
    if (s.includes("adult")) return "adult_band";
    if (s.includes("rock 101") || s.includes("r101")) return "rock_101";
    if (s.includes("rookies")) return "rookies";
    if (s.includes("little wing")) return "little_wing";

    return "lessons_only";
}

const PROGRAM_PRIORITY: Record<string, number> = {
    performance_program: 5,
    rock_101: 4,
    rookies: 3,
    little_wing: 2,
    adult_band: 1,
    lessons_only: 0,
};

// ── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

// ── Student sync — Pass 1 ────────────────────────────────────────────────────

async function getActiveProgramMap(): Promise<Map<number, string>> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const filter = ["and", [
        ["eq", "state", "registered"],
        ["gt", "start_at", yesterdayStr],
    ]];

    const programMap = new Map<number, string>();
    let startingAfter: string | undefined = undefined;

    while (true) {
        const body = {
            data: {
                type: "queries",
                attributes: {
                    fields: ["person_id", "service_name"],
                    filter,
                    page: {
                        limit: 500,
                        ...(startingAfter ? { starting_after: startingAfter } : {}),
                    },
                },
            },
        };

        const res = await fetch(`${PIKE13_BASE}/desk/api/v3/reports/enrollments/queries`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${PIKE13_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Enrollments API failed (${res.status}): ${text}`);
        }

        const json = await res.json();
        const attrs = json?.data?.attributes ?? {};
        const rows: unknown[][] = attrs.rows ?? [];

        for (const row of rows) {
            const personId = Number(row[0]);
            const serviceName = String(row[1] ?? "");
            if (!personId) continue;

            const program = detectProgram(serviceName);
            if (program === null) continue;

            const current = programMap.get(personId);
            const currentPriority = current !== undefined ? (PROGRAM_PRIORITY[current] ?? -1) : -1;
            const newPriority = PROGRAM_PRIORITY[program] ?? -1;
            if (newPriority > currentPriority) {
                programMap.set(personId, program);
            }
        }

        if (!attrs.has_more) break;
        startingAfter = attrs.last_key;
        if (!startingAfter) break;
    }

    return programMap;
}

// ── Student sync — Pass 2 ────────────────────────────────────────────────────

function extractInstrument(person: Record<string, unknown>): string {
    const fields = (person.custom_fields as { name?: string; value?: string | string[] }[]) ?? [];
    const field = fields.find((f) => f.name === "Instrument");
    if (!field) return "";
    const val = field.value;
    if (Array.isArray(val)) return val[0] ?? "";
    return val ?? "";
}

async function enrichPersonIds(
    personIds: number[]
): Promise<Map<number, Record<string, unknown>>> {
    const detailMap = new Map<number, Record<string, unknown>>();
    const batches = chunk(personIds, 50);

    for (let i = 0; i < batches.length; i++) {
        if (i > 0) await sleep(400);

        const ids = batches[i].join(",");
        const res = await fetch(
            `${PIKE13_BASE}/api/v2/desk/people.json?ids=${ids}&per_page=50`,
            { headers: { Authorization: `Bearer ${PIKE13_TOKEN}` } }
        );

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Core API people fetch failed (${res.status}): ${text}`);
        }

        const data = await res.json();
        const people: Record<string, unknown>[] = data.people ?? [];
        for (const p of people) {
            detailMap.set(p.id as number, p);
        }
    }

    return detailMap;
}

// ── Student sync ─────────────────────────────────────────────────────────────

async function syncStudents(): Promise<{
    upserted: number;
    failed: number;
    byProgram: Record<string, number>;
    errors: string[];
}> {
    const errors: string[] = [];
    const byProgram: Record<string, number> = {
        performance_program: 0,
        rock_101: 0,
        rookies: 0,
        little_wing: 0,
        adult_band: 0,
        lessons_only: 0,
    };

    const programMap = await getActiveProgramMap();
    const personIdArray = Array.from(programMap.keys());
    const detailMap = await enrichPersonIds(personIdArray);

    const records: Record<string, unknown>[] = [];
    for (const personId of personIdArray) {
        const p = detailMap.get(personId);
        if (!p) continue;

        const instrument = extractInstrument(p);
        const parentEmail = (p.guardian_email as string) || (p.email as string) || "";
        const program = programMap.get(personId) ?? "lessons_only";

        records.push({
            first_name: p.first_name ?? "",
            last_initial: ((p.last_name as string) ?? "").charAt(0).toUpperCase(),
            instrument,
            parent_email: parentEmail,
            school: SCHOOL_SLUG,
            school_id: SCHOOL_SLUG,
            program,
            active: true,
            pike13_person_id: String(personId),
        });
    }

    let upserted = 0;
    let failed = 0;

    for (const batch of chunk(records, 50)) {
        const { error } = await supabase
            .from("students")
            .upsert(batch, { onConflict: "pike13_person_id" });

        if (error) {
            failed += batch.length;
            errors.push(`Student upsert batch failed: ${error.message}`);
        } else {
            upserted += batch.length;
            for (const r of batch) {
                const prog = (r.program as string) ?? "lessons_only";
                byProgram[prog] = (byProgram[prog] ?? 0) + 1;
            }
        }
    }

    return { upserted, failed, byProgram, errors };
}

// ── Staff sync ───────────────────────────────────────────────────────────────

const SYSTEM_EMAIL_PATTERNS = ["it@", "it+", "it-", "it_"];

function isSystemAccount(email: string): boolean {
    return (
        email?.endsWith("@schoolofrock.com") &&
        SYSTEM_EMAIL_PATTERNS.some((p) => email.startsWith(p))
    );
}

async function syncStaff(): Promise<{
    updated: number;
    failed: number;
    errors: string[];
}> {
    const errors: string[] = [];

    const pike13Res = await fetch(`${PIKE13_BASE}/api/v2/desk/staff_members`, {
        headers: { Authorization: `Bearer ${PIKE13_TOKEN}` },
    });

    if (!pike13Res.ok) {
        const text = await pike13Res.text();
        throw new Error(`Pike13 staff fetch failed (${pike13Res.status}): ${text}`);
    }

    const pike13Data = await pike13Res.json();
    const allStaff: Record<string, unknown>[] =
        (pike13Data.staff_members ?? pike13Data.people ?? []) as Record<string, unknown>[];

    const activeStaff = allStaff.filter((p) => {
        if (p.deleted_at || p.hidden_at) return false;
        if (isSystemAccount(p.email as string)) return false;
        return true;
    });

    const { data: supabaseStaff, error: supabaseError } = await supabase
        .from("staff")
        .select("id, email")
        .eq("school_slug", SCHOOL_SLUG);

    if (supabaseError) {
        throw new Error(`Supabase staff fetch failed: ${supabaseError.message}`);
    }

    const supabaseByEmail = new Map<string, { id: string; email: string }>();
    for (const s of supabaseStaff ?? []) {
        if (s.email) supabaseByEmail.set(s.email.toLowerCase(), s);
    }

    let updated = 0;
    let failed = 0;

    for (const p of activeStaff) {
        const email = (p.email as string) ?? "";
        const pike13Role = (p.role ?? p.staff_role ?? "") as string;
        const existing = supabaseByEmail.get(email.toLowerCase());

        if (!existing) continue;

        const { error } = await supabase
            .from("staff")
            .update({ pike13_person_id: p.id, pike13_role: pike13Role })
            .eq("id", existing.id);

        if (error) {
            failed++;
            errors.push(`Staff update failed for ${email}: ${error.message}`);
        } else {
            updated++;
        }
    }

    return { updated, failed, errors };
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async () => {
    const startTime = Date.now();

    try {
        const [studentResult, staffResult] = await Promise.allSettled([
            syncStudents(),
            syncStaff(),
        ]);

        const students =
            studentResult.status === "fulfilled"
                ? studentResult.value
                : { upserted: 0, failed: 0, byProgram: {}, errors: [String(studentResult.reason)] };

        const staff =
            staffResult.status === "fulfilled"
                ? staffResult.value
                : { updated: 0, failed: 0, errors: [String(staffResult.reason)] };

        const allErrors = [...students.errors, ...staff.errors];
        const durationSeconds = Math.round((Date.now() - startTime) / 1000);

        const hasFailures = students.failed > 0 || staff.failed > 0 || allErrors.length > 0;
        const status = allErrors.length > 0 && students.upserted === 0 && staff.updated === 0
            ? "error"
            : hasFailures
            ? "partial"
            : "success";

        const logRow = {
            school_slug: SCHOOL_SLUG,
            students_upserted: students.upserted,
            students_failed: students.failed,
            staff_updated: staff.updated,
            staff_failed: staff.failed,
            by_program: students.byProgram,
            errors: allErrors,
            duration_seconds: durationSeconds,
            status,
        };

        await supabase.from("pike13_sync_log").insert(logRow);

        return new Response(JSON.stringify(logRow), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (err) {
        const durationSeconds = Math.round((Date.now() - startTime) / 1000);
        const message = err instanceof Error ? err.message : String(err);

        const logRow = {
            school_slug: SCHOOL_SLUG,
            students_upserted: 0,
            students_failed: 0,
            staff_updated: 0,
            staff_failed: 0,
            by_program: {},
            errors: [message],
            duration_seconds: durationSeconds,
            status: "error",
        };

        await supabase.from("pike13_sync_log").insert(logRow).catch(() => null);

        return new Response(`ERROR: ${message}`, {
            status: 500,
            headers: { "Content-Type": "text/plain" },
        });
    }
});
