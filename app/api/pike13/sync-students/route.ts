import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PIKE13_REPORT_URL =
    "https://delmar-sor.pike13.com/desk/api/v3/reports/clients/queries";

const BASE_FIELDS = [
    "person_id",
    "first_name",
    "last_name",
    "email",
    "guardian_email",
    "guardian_name",
    "also_staff",
    "future_visits",
    "custom_fields",
];

const FILTER = ["and", [
    ["gt", "future_visits", 0],
    ["eq", "also_staff", "f"],
    ["eq", "person_state", "active"],
]];

async function fetchPage(token: string, startingAfter?: string): Promise<any> {
    const body: any = {
        data: {
            type: "queries",
            attributes: {
                fields: BASE_FIELDS,
                filter: FILTER,
                page: { limit: 500, ...(startingAfter ? { starting_after: startingAfter } : {}) },
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
        throw new Error(`Pike13 report fetch failed (${res.status}): ${text}`);
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

        // ── Fetch school_id from Supabase ────────────────────────────────────
        const { data: schoolRows, error: schoolError } = await supabase
            .from("schools")
            .select("id")
            .ilike("name", "%del mar%")
            .limit(1);

        if (schoolError) {
            return new NextResponse(`Supabase school lookup failed: ${schoolError.message}`, {
                status: 500,
                headers: { "Content-Type": "text/plain" },
            });
        }
        const schoolId: string | null = schoolRows?.[0]?.id ?? null;

        // ── Paginate through Reporting API ───────────────────────────────────
        const allRows: any[][] = [];
        let instrumentColIndex: number | null = null;
        let startingAfter: string | undefined = undefined;

        while (true) {
            const json = await fetchPage(token, startingAfter);
            const attrs = json?.data?.attributes ?? {};
            const rows: any[][] = attrs.rows ?? [];

            // On first page, find instrument column by display_name
            if (instrumentColIndex === null) {
                const fieldMeta: any[] = attrs.fields ?? [];
                const idx = fieldMeta.findIndex(
                    (f: any) => (f.display_name ?? f.name) === "Instrument"
                );
                instrumentColIndex = idx >= 0 ? idx : null;
            }

            allRows.push(...rows);

            if (!attrs.has_more) break;
            startingAfter = attrs.last_key;
            if (!startingAfter) break;
        }

        // ── Build preview records ────────────────────────────────────────────
        const willImport = allRows.map((row) => {
            const instrument =
                instrumentColIndex !== null ? (row[instrumentColIndex] ?? "") : "";

            return {
                first_name: row[1] ?? "",
                last_initial: (row[2] as string)?.charAt(0).toUpperCase() ?? "",
                parent_email: row[3] || row[4] || "",
                pike13_person_id: String(row[0]),
                school: "del-mar",
                school_id: schoolId,
                program: "rock_101",
                active: true,
                instrument,
            };
        });

        return NextResponse.json({
            total_active_students: willImport.length,
            will_import: willImport,
        });

    } catch (err) {
        return new NextResponse(
            `ERROR: ${err instanceof Error ? err.message : String(err)}`,
            { status: 500, headers: { "Content-Type": "text/plain" } }
        );
    }
}
