import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PIKE13_BASE = "https://delmar-sor.pike13.com";

// ── Pass 1: Enrollments Reporting API ───────────────────────────────────────

const ENROLL_FIELDS = ["person_id", "full_name", "email", "service_category", "state"];

async function fetchEnrollmentPage(token: string, filter: any[], startingAfter?: string): Promise<any> {
    const body = {
        data: {
            type: "queries",
            attributes: {
                fields: ENROLL_FIELDS,
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

async function getActivePersonIds(token: string): Promise<Set<number>> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const filter = ["and", [
        ["eq", "state", "registered"],
        ["gt", "start_at", yesterdayStr],
        ["or", [
            ["eq", "service_category", "Lessons"],
            ["eq", "service_category", "Classes and Rehearsals"],
        ]],
    ]];

    const activeIds = new Set<number>();
    let startingAfter: string | undefined = undefined;

    while (true) {
        const json = await fetchEnrollmentPage(token, filter, startingAfter);
        const attrs = json?.data?.attributes ?? {};
        const rows: any[][] = attrs.rows ?? [];

        for (const row of rows) {
            const personId = Number(row[0]);
            if (personId) activeIds.add(personId);
        }

        if (!attrs.has_more) break;
        startingAfter = attrs.last_key;
        if (!startingAfter) break;
    }

    return activeIds;
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

async function enrichPersonIds(token: string, personIds: number[]): Promise<Map<number, any>> {
    const detailMap = new Map<number, any>();
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
        const people: any[] = data.people ?? [];

        for (const p of people) {
            detailMap.set(p.id, p);
        }
    }

    return detailMap;
}

function extractInstrument(person: any): string {
    const fields: any[] = person.custom_fields ?? [];
    const field = fields.find((f: any) => f.name === "Instrument");
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

        // Pass 1 — get active person IDs
        const activePersonIds = await getActivePersonIds(token);

        // Pass 2 — enrich with Core API details
        const personIdArray = Array.from(activePersonIds);
        const detailMap = await enrichPersonIds(token, personIdArray);

        // Merge
        const willImport: any[] = [];
        let totalMissingDetails = 0;

        for (const personId of personIdArray) {
            const p = detailMap.get(personId);

            if (!p) {
                totalMissingDetails++;
                continue;
            }

            const instrument = extractInstrument(p);
            const parentEmail = p.guardian_email || p.email || "";

            willImport.push({
                first_name: p.first_name ?? "",
                last_initial: (p.last_name as string)?.charAt(0).toUpperCase() ?? "",
                instrument,
                parent_email: parentEmail,
                school: "del-mar",
                school_id: "del-mar",
                program: "rock_101",
                active: true,
                pike13_person_id: String(personId),
            });
        }

        return NextResponse.json({
            total_active_person_ids: activePersonIds.size,
            total_enriched: willImport.length,
            total_missing_details: totalMissingDetails,
            will_import: willImport,
        });

    } catch (err) {
        return new NextResponse(
            `ERROR: ${err instanceof Error ? err.message : String(err)}`,
            { status: 500, headers: { "Content-Type": "text/plain" } }
        );
    }
}
