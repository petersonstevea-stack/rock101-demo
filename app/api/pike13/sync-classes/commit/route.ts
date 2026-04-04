import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PIKE13_BASE = "https://delmar-sor.pike13.com";

// ── Service ID maps (Del Mar) ────────────────────────────────────────────────

const SERVICE_PROGRAM_MAP: Record<number, string> = {
    230410: "rock_101",
    230411: "performance_program",
    230412: "performance_program",
    230413: "performance_program",
    230415: "performance_program",
};

const SKIP_SERVICE_IDS = new Set([306284, 316034, 316036, 316038, 316040, 316042, 316045]);

// ── UTC → America/Los_Angeles helpers ────────────────────────────────────────

function toLADate(utcStr: string): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(utcStr));
}

function toLATime(utcStr: string): string {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Los_Angeles",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(new Date(utcStr));
}

// ── Pass 1: Fetch event occurrences (8 weeks) ────────────────────────────────

async function fetchOccurrences(token: string): Promise<unknown[]> {
    const today = new Date();
    const sixWeeksOut = new Date();
    sixWeeksOut.setDate(today.getDate() + 42);

    const from = today.toISOString().split("T")[0];
    const to = sixWeeksOut.toISOString().split("T")[0];

    const allOccurrences: unknown[] = [];
    let url: string | null =
        `${PIKE13_BASE}/api/v2/desk/event_occurrences.json?from=${from}&to=${to}&per_page=100`;

    while (url) {
        const fetchUrl: string = url;
        const res = await fetch(fetchUrl, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Event occurrences fetch failed (${res.status}): ${text}`);
        }

        const data = await res.json();
        const batch: unknown[] = data.event_occurrences ?? [];
        allOccurrences.push(...batch);
        url = (data.meta?.next as string) ?? null;
    }

    return allOccurrences;
}

// ── Pass 2: Fetch event names ────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchEventNames(
    token: string,
    eventIds: number[]
): Promise<Map<number, string>> {
    const nameMap = new Map<number, string>();

    for (let i = 0; i < eventIds.length; i++) {
        if (i > 0) await sleep(200);

        const res = await fetch(`${PIKE13_BASE}/api/v2/desk/events/${eventIds[i]}.json`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
            console.error(`fetchEventNames: event ${eventIds[i]} fetch failed (${res.status})`);
            continue;
        }

        const data = await res.json();
        const name: string = data.events?.[0]?.name ?? "";
        if (name) {
            nameMap.set(eventIds[i], name);
        } else {
            console.error(`fetchEventNames: no name found for event ${eventIds[i]}`, JSON.stringify(data).slice(0, 200));
        }
    }

    return nameMap;
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

        // Pass 1 — fetch and filter occurrences
        const allOccurrences = await fetchOccurrences(token);

        type Occurrence = {
            id: number;
            event_id: number;
            service_id: number;
            start_at: string;
            end_at: string;
        };

        const filtered = allOccurrences.filter((occ) => {
            const o = occ as Occurrence;
            return SERVICE_PROGRAM_MAP[o.service_id] !== undefined &&
                !SKIP_SERVICE_IDS.has(o.service_id);
        }) as Occurrence[];

        // Pass 2 — fetch event names for unique event_ids
        const uniqueEventIds = [...new Set(filtered.map((o) => o.event_id))];
        const nameMap = await fetchEventNames(token, uniqueEventIds);

        // Pass 3 — group by event_id and upsert
        const eventGroups = new Map<number, Occurrence[]>();
        for (const occ of filtered) {
            if (!eventGroups.has(occ.event_id)) eventGroups.set(occ.event_id, []);
            eventGroups.get(occ.event_id)!.push(occ);
        }

        let classesCreated = 0;
        let sessionsCreated = 0;
        const failed: { context: string; error: string }[] = [];

        for (const [eventId, occs] of eventGroups.entries()) {
            const serviceId = occs[0].service_id;
            const program = SERVICE_PROGRAM_MAP[serviceId] ?? "unknown";
            const name = nameMap.get(eventId) ?? `(event ${eventId})`;

            // Upsert rock_classes
            const classRecord = {
                name,
                school: "del-mar",
                school_id: "del-mar",
                pike13_service_id: String(serviceId),
                pike13_event_id: eventId,
                program_id: program,
            };

            const { data: upsertedClass, error: classError } = await supabase
                .from("rock_classes")
                .upsert(classRecord, { onConflict: "pike13_event_id" })
                .select("id")
                .single();

            if (classError || !upsertedClass) {
                failed.push({
                    context: `rock_classes upsert for event ${eventId} (${name})`,
                    error: classError?.message ?? "no row returned",
                });
                continue;
            }

            classesCreated++;

            // Build session records
            const sessionRecords = occs.map((occ) => ({
                class_id: upsertedClass.id,
                session_date: toLADate(occ.start_at),
                start_time: toLATime(occ.start_at),
                end_time: toLATime(occ.end_at),
                status: "scheduled",
                pike13_event_occurrence_id: String(occ.id),
            }));

            const { error: sessionsError } = await supabase
                .from("class_sessions")
                .upsert(sessionRecords, { onConflict: "class_id,session_date" });

            if (sessionsError) {
                failed.push({
                    context: `class_sessions upsert for event ${eventId} (${name})`,
                    error: sessionsError.message,
                });
            } else {
                sessionsCreated += sessionRecords.length;
            }
        }

        return NextResponse.json({
            classes_created: classesCreated,
            sessions_created: sessionsCreated,
            failed,
        });

    } catch (err) {
        return new NextResponse(
            `ERROR: ${err instanceof Error ? err.message : String(err)}`,
            { status: 500, headers: { "Content-Type": "text/plain" } }
        );
    }
}
