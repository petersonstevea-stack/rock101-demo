import { NextResponse } from "next/server";

const PIKE13_REPORT_URL =
    "https://delmar-sor.pike13.com/desk/api/v3/reports/enrollments/queries";

// Field indices
const F_SERVICE_NAME = 0;
const F_CATEGORY = 1;
const F_PERSON_ID = 2;

export async function GET() {
    try {
        const token = process.env.PIKE13_ACCESS_TOKEN;
        if (!token) {
            return new NextResponse("PIKE13_ACCESS_TOKEN is not set", {
                status: 500,
                headers: { "Content-Type": "text/plain" },
            });
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        const filter = ["and", [
            ["eq", "state", "registered"],
            ["gt", "start_at", yesterdayStr],
        ]];

        // ── Paginate ─────────────────────────────────────────────────────────
        const allRows: any[][] = [];
        let startingAfter: string | undefined = undefined;

        while (true) {
            const body: Record<string, unknown> = {
                data: {
                    type: "queries",
                    attributes: {
                        fields: ["service_name", "service_category", "person_id"],
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
                return new NextResponse(`Pike13 fetch failed (${res.status}): ${text}`, {
                    status: 502,
                    headers: { "Content-Type": "text/plain" },
                });
            }

            const json = await res.json();
            const attrs = json?.data?.attributes ?? {};
            const rows: any[][] = attrs.rows ?? [];
            allRows.push(...rows);

            if (!attrs.has_more) break;
            startingAfter = attrs.last_key;
            if (!startingAfter) break;
        }

        // ── Aggregate by service name ─────────────────────────────────────────
        const serviceMap = new Map<string, { category: string; personIds: Set<number> }>();

        for (const row of allRows) {
            const serviceName: string = row[F_SERVICE_NAME] ?? "(unknown)";
            const category: string = row[F_CATEGORY] ?? "";
            const personId = Number(row[F_PERSON_ID]);

            if (!serviceMap.has(serviceName)) {
                serviceMap.set(serviceName, { category, personIds: new Set() });
            }
            if (personId) serviceMap.get(serviceName)!.personIds.add(personId);
        }

        const services = Array.from(serviceMap.entries())
            .map(([service_name, { category, personIds }]) => ({
                service_name,
                category,
                unique_students: personIds.size,
            }))
            .sort((a, b) => b.unique_students - a.unique_students);

        return NextResponse.json({
            total_rows: allRows.length,
            services,
        });

    } catch (err) {
        return new NextResponse(
            `ERROR: ${err instanceof Error ? err.message : String(err)}`,
            { status: 500, headers: { "Content-Type": "text/plain" } }
        );
    }
}
