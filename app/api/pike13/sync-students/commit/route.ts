import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PIKE13_BASE = "https://delmar-sor.pike13.com";

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

// ── Pass 1: Enrollments Reporting API ───────────────────────────────────────

async function fetchEnrollmentPage(
    token: string,
    filter: unknown[],
    startingAfter?: string
): Promise<unknown> {
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
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Enrollments API failed (${res.status}): ${text}`);
    }

    return res.json();
}

async function getActiveProgramMap(token: string): Promise<Map<number, string>> {
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
        const json = await fetchEnrollmentPage(token, filter, startingAfter) as {
            data?: { attributes?: { rows?: unknown[][]; has_more?: boolean; last_key?: string } };
        };
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

// ── Pass 2: Core API batch client lookup ─────────────────────────────────────

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

async function enrichPersonIds(token: string, personIds: number[]): Promise<Map<number, unknown>> {
    const detailMap = new Map<number, unknown>();
    const batches = chunk(personIds, 50);

    for (let i = 0; i < batches.length; i++) {
        if (i > 0) await sleep(400);

        const ids = batches[i].join(",");
        const url = `${PIKE13_BASE}/api/v2/desk/people.json?ids=${ids}&per_page=50`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Core API people fetch failed (${res.status}): ${text}`);
        }

        const data = await res.json();
        const people: unknown[] = (data as { people?: unknown[] }).people ?? [];

        for (const p of people as { id: number }[]) {
            detailMap.set(p.id, p);
        }
    }

    return detailMap;
}

function extractInstrument(person: unknown): string {
    const p = person as { custom_fields?: { name?: string; value?: string | string[] }[] };
    const fields = p.custom_fields ?? [];
    const field = fields.find((f) => f.name === "Instrument");
    if (!field) return "";
    const val = field.value;
    if (Array.isArray(val)) return val[0] ?? "";
    return val ?? "";
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function GET() {
    try {
        const token = process.env.PIKE13_ACCESS_TOKEN;
        if (!token) {
            return new NextResponse("PIKE13_ACCESS_TOKEN is not set", {
                status: 500,
                headers: { "Content-Type": "text/plain" },
            });
        }

        // Pass 1 — get active person IDs with program assignments
        const programMap = await getActiveProgramMap(token);

        // Pass 2 — enrich with Core API details
        const personIdArray = Array.from(programMap.keys());
        const detailMap = await enrichPersonIds(token, personIdArray);

        // Build records
        const records: Record<string, unknown>[] = [];

        for (const personId of personIdArray) {
            const p = detailMap.get(personId) as {
                first_name?: string;
                last_name?: string;
                email?: string;
                guardian_email?: string;
            } | undefined;

            if (!p) continue;

            const instrument = extractInstrument(p);
            const parentEmail = p.guardian_email || p.email || "";
            const program = programMap.get(personId) ?? "lessons_only";

            records.push({
                first_name: p.first_name ?? "",
                last_initial: (p.last_name as string)?.charAt(0).toUpperCase() ?? "",
                instrument,
                parent_email: parentEmail,
                school: "del-mar",
                school_id: "del-mar",
                program,
                active: true,
                pike13_person_id: String(personId),
            });
        }

        // Insert in batches of 50
        const batches = chunk(records, 50);
        let totalInserted = 0;
        const failed: { record: unknown; error: string }[] = [];

        const byProgram: Record<string, number> = {
            performance_program: 0,
            rock_101: 0,
            rookies: 0,
            little_wing: 0,
            adult_band: 0,
            lessons_only: 0,
        };

        for (const batch of batches) {
            const { error } = await supabase.from("students").upsert(batch, {
                onConflict: "pike13_person_id",
            });

            if (error) {
                for (const record of batch) {
                    failed.push({ record, error: error.message });
                }
            } else {
                totalInserted += batch.length;
                for (const record of batch) {
                    const prog = (record.program as string) ?? "lessons_only";
                    byProgram[prog] = (byProgram[prog] ?? 0) + 1;
                }
            }
        }

        return NextResponse.json({
            total_inserted: totalInserted,
            total_failed: failed.length,
            by_program: byProgram,
            failed,
        });

    } catch (err) {
        return new NextResponse(
            `ERROR: ${err instanceof Error ? err.message : String(err)}`,
            { status: 500, headers: { "Content-Type": "text/plain" } }
        );
    }
}
