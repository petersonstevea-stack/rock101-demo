import { NextResponse } from "next/server";

const PIKE13_BASE = "https://delmar-sor.pike13.com";

const PROGRAM_KEYWORDS = ["rock 101", "r101", "seasonal", "house band", "show rehearsal"];

export async function GET() {
    try {
        const token = process.env.PIKE13_ACCESS_TOKEN;
        if (!token) {
            return new NextResponse("PIKE13_ACCESS_TOKEN is not set", {
                status: 500,
                headers: { "Content-Type": "text/plain" },
            });
        }

        const today = new Date();
        const fourWeeksOut = new Date();
        fourWeeksOut.setDate(today.getDate() + 28);

        const from = today.toISOString().split("T")[0];
        const to = fourWeeksOut.toISOString().split("T")[0];

        const url = `${PIKE13_BASE}/api/v2/desk/event_occurrences.json?from=${from}&to=${to}&per_page=100`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
            const text = await res.text();
            return new NextResponse(`Pike13 fetch failed (${res.status}): ${text}`, {
                status: 502,
                headers: { "Content-Type": "text/plain" },
            });
        }

        const data = await res.json();
        const occurrences: unknown[] = data.event_occurrences ?? [];

        const filtered = occurrences
            .filter((occ) => {
                const name = String((occ as { name?: string }).name ?? "").toLowerCase();
                return PROGRAM_KEYWORDS.some((kw) => name.includes(kw));
            })
            .map((occ) => {
                const o = occ as {
                    id?: unknown;
                    event_id?: unknown;
                    service_id?: unknown;
                    name?: unknown;
                    start_at?: unknown;
                    end_at?: unknown;
                    staff_members?: unknown;
                };
                return {
                    id: o.id,
                    event_id: o.event_id,
                    service_id: o.service_id,
                    name: o.name,
                    start_at: o.start_at,
                    end_at: o.end_at,
                    staff_members: o.staff_members,
                };
            });

        return NextResponse.json({
            total_occurrences: occurrences.length,
            filtered,
        });

    } catch (err) {
        return new NextResponse(
            `ERROR: ${err instanceof Error ? err.message : String(err)}`,
            { status: 500, headers: { "Content-Type": "text/plain" } }
        );
    }
}
