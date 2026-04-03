import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PIKE13_REPORT_URL =
    "https://delmar-sor.pike13.com/desk/api/v3/reports/enrollments/queries";

const FIELDS = [
    "person_id",
    "full_name",
    "email",
    "service_category",
    "state",
];

// Field indices (match FIELDS array order)
const F_PERSON_ID = 0;
const F_FULL_NAME = 1;
const F_EMAIL = 2;

async function fetchPage(token: string, startingAfter?: string): Promise<any> {
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

    const body: any = {
        data: {
            type: "queries",
            attributes: {
                fields: FIELDS,
                filter,
                page: {
                    limit: 500,
                    ...(startingAfter ? { starting_after: startingAfter } : {}),
                },
            },
        },
    };

    const res = await fetch(PIKE13_REPORT_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Pike13 enrollments fetch failed (${res.status}): ${text}`);
    }

    return res.json();
}

export async function GET() {
    try {
        const token = process.env.PIKE13_ACCESS_TOKEN;
        if (!token) {
            return new NextResponse("PIKE13_ACCESS_TOKEN is not set", {
                status: 500,
                headers: { "Content-Type": "text/plain" },
            });
        }

        // ── Paginate through enrollment rows ─────────────────────────────────
        const allRows: any[][] = [];
        let startingAfter: string | undefined = undefined;

        while (true) {
            const json = await fetchPage(token, startingAfter);
            const attrs = json?.data?.attributes ?? {};
            const rows: any[][] = attrs.rows ?? [];

            allRows.push(...rows);

            if (!attrs.has_more) break;
            startingAfter = attrs.last_key;
            if (!startingAfter) break;
        }

        // ── De-duplicate by person_id ────────────────────────────────────────
        const seenIds = new Map<string, any[]>();
        for (const row of allRows) {
            const personId = String(row[F_PERSON_ID]);
            if (!seenIds.has(personId)) {
                seenIds.set(personId, row);
            }
        }

        // ── Build preview records ────────────────────────────────────────────
        const willImport = Array.from(seenIds.values()).map((row) => {
            const fullName: string = row[F_FULL_NAME] ?? "";
            const parts = fullName.trim().split(" ");
            const first_name = parts[0] ?? "";
            const last_initial = parts[1]?.charAt(0).toUpperCase() ?? "";

            return {
                first_name,
                last_initial,
                parent_email: row[F_EMAIL] ?? "",
                pike13_person_id: String(row[F_PERSON_ID]),
                school: "del-mar",
                school_id: "del-mar",
                program: "rock_101",
                active: true,
                instrument: "",
            };
        });

        return NextResponse.json({
            total_enrolled_rows: allRows.length,
            total_unique_students: willImport.length,
            will_import: willImport,
        });

    } catch (err) {
        return new NextResponse(
            `ERROR: ${err instanceof Error ? err.message : String(err)}`,
            { status: 500, headers: { "Content-Type": "text/plain" } }
        );
    }
}
