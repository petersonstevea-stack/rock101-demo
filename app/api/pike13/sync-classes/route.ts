import { NextResponse } from "next/server";

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

        type StaffMember = { name?: string };

        type Occurrence = {
            id: number;
            event_id: number;
            service_id: number;
            start_at: string;
            end_at: string;
            staff_members?: StaffMember[];
        };

        const filtered = allOccurrences.filter((occ) => {
            const o = occ as Occurrence;
            return SERVICE_PROGRAM_MAP[o.service_id] !== undefined &&
                !SKIP_SERVICE_IDS.has(o.service_id);
        }) as Occurrence[];

        // Pass 2 — fetch event names for unique event_ids
        const uniqueEventIds = [...new Set(filtered.map((o) => o.event_id))];
        const nameMap = await fetchEventNames(token, uniqueEventIds);

        // Pass 3 — group by event_id
        const eventGroups = new Map<number, Occurrence[]>();
        for (const occ of filtered) {
            if (!eventGroups.has(occ.event_id)) eventGroups.set(occ.event_id, []);
            eventGroups.get(occ.event_id)!.push(occ);
        }

        // Pass 4 — build base names, detect conflicts, resolve with instructor suffix
        function toLocalDayTime(utcStr: string): { day: string; time: string } {
            const dt = new Date(utcStr);
            const day = dt.toLocaleDateString("en-US", {
                timeZone: "America/Los_Angeles",
                weekday: "long",
            });
            const time = dt.toLocaleTimeString("en-US", {
                timeZone: "America/Los_Angeles",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            });
            return { day, time };
        }

        // Build base name for each event_id
        const baseNames = new Map<number, string>();
        for (const [eventId, occs] of eventGroups.entries()) {
            const rawName = nameMap.get(eventId) ?? `(event ${eventId})`;
            const { day, time } = toLocalDayTime(occs[0].start_at);
            baseNames.set(eventId, `${rawName} — ${day} ${time}`);
        }

        // Count how many events share each base name
        const baseNameCount = new Map<string, number>();
        for (const baseName of baseNames.values()) {
            baseNameCount.set(baseName, (baseNameCount.get(baseName) ?? 0) + 1);
        }

        // Resolve final names
        const resolvedNames = new Map<number, string>();
        for (const [eventId, baseName] of baseNames.entries()) {
            if ((baseNameCount.get(baseName) ?? 1) <= 1) {
                resolvedNames.set(eventId, baseName);
            } else {
                const occs = eventGroups.get(eventId)!;
                const staffName = occs[0].staff_members?.[0]?.name ?? "";
                const suffix = staffName
                    ? staffName.trim().split(/\s+/).pop()!
                    : `ev-${eventId}`;
                resolvedNames.set(eventId, `${baseName} (${suffix})`);
            }
        }

        const classesToCreate = Array.from(eventGroups.entries()).map(([eventId, occs]) => {
            const serviceId = occs[0].service_id;
            const program = SERVICE_PROGRAM_MAP[serviceId] ?? "unknown";
            const sessions = occs.map((o) => toLADate(o.start_at)).sort();
            return {
                event_id: eventId,
                service_id: serviceId,
                program,
                name: resolvedNames.get(eventId)!,
                session_count: occs.length,
                first_session: sessions[0],
                last_session: sessions[sessions.length - 1],
            };
        });

        return NextResponse.json({
            total_occurrences_fetched: filtered.length,
            unique_events: uniqueEventIds.length,
            classes_to_create: classesToCreate,
        });

    } catch (err) {
        return new NextResponse(
            `ERROR: ${err instanceof Error ? err.message : String(err)}`,
            { status: 500, headers: { "Content-Type": "text/plain" } }
        );
    }
}

export { toLADate, toLATime };
