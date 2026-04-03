import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        const token = process.env.PIKE13_ACCESS_TOKEN;
        if (!token) {
            return new NextResponse("PIKE13_ACCESS_TOKEN is not set", { status: 500, headers: { "Content-Type": "text/plain" } });
        }

        const headers = { Authorization: `Bearer ${token}` };

        // ── Fetch staff IDs to exclude ───────────────────────────────────────
        const staffRes = await fetch(
            "https://delmar-sor.pike13.com/api/v2/desk/staff_members",
            { headers }
        );
        if (!staffRes.ok) {
            return new NextResponse(`Pike13 staff fetch failed: ${staffRes.status}`, { status: 502, headers: { "Content-Type": "text/plain" } });
        }
        const staffData = await staffRes.json();
        const staffIds = new Set<number>(
            (staffData.staff_members ?? staffData.people ?? []).map((s: any) => s.id)
        );

        // ── Fetch school_id from Supabase ────────────────────────────────────
        const { data: schoolRows, error: schoolError } = await supabase
            .from("schools")
            .select("id")
            .ilike("name", "%del mar%")
            .limit(1);

        if (schoolError) {
            return new NextResponse(`Supabase school lookup failed: ${schoolError.message}`, { status: 500, headers: { "Content-Type": "text/plain" } });
        }
        const schoolId: string | null = schoolRows?.[0]?.id ?? null;

        // ── Paginate through all Pike13 people ───────────────────────────────
        const allPeople: any[] = [];
        let page = 1;

        while (true) {
            const url = `https://delmar-sor.pike13.com/api/v2/desk/people?per_page=100&page=${page}`;
            const res = await fetch(url, { headers });

            if (!res.ok) {
                return new NextResponse(`Pike13 people fetch failed at page ${page}: ${res.status}`, { status: 502, headers: { "Content-Type": "text/plain" } });
            }

            const data = await res.json();
            const people: any[] = data.people ?? [];
            allPeople.push(...people);

            if (!data.meta?.next) break;
            page++;
        }

        // ── Filter and build preview records ─────────────────────────────────
        let deletedExcluded = 0;
        let staffExcluded = 0;
        const willImport: any[] = [];

        for (const p of allPeople) {
            if (p.deleted_at || p.hidden_at) {
                deletedExcluded++;
                continue;
            }
            if (staffIds.has(p.id)) {
                staffExcluded++;
                continue;
            }

            // Extract instrument from custom fields
            const instrumentField = (p.custom_fields ?? []).find(
                (f: any) => f.name?.toLowerCase() === "instrument"
            );
            let instrument = "";
            if (instrumentField) {
                const val = instrumentField.value;
                instrument = Array.isArray(val) ? val[0] ?? "" : val ?? "";
            }

            willImport.push({
                first_name: p.first_name ?? "",
                last_initial: p.last_name?.charAt(0).toUpperCase() ?? "",
                instrument,
                parent_email: p.email ?? p.guardian_email ?? "",
                school: "del-mar",
                school_id: schoolId,
                pike13_person_id: String(p.id),
                program: "rock_101",
                active: true,
            });
        }

        return NextResponse.json({
            total_in_pike13: allPeople.length,
            staff_excluded: staffExcluded,
            deleted_excluded: deletedExcluded,
            total_will_import: willImport.length,
            will_import: willImport,
        });

    } catch (err) {
        return new NextResponse(
            `ERROR: ${err instanceof Error ? err.message : String(err)}`,
            { status: 500, headers: { "Content-Type": "text/plain" } }
        );
    }
}
