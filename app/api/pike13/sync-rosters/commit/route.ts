import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PIKE13_BASE = "https://delmar-sor.pike13.com";

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

type RockClass = {
    id: string;
    name: string;
    pike13_event_id: number;
    student_ids: string[] | null;
};

type ClassSession = {
    pike13_event_occurrence_id: string;
    session_date: string;
};

type Visit = {
    person_id: number;
    state: string;
    person: { id: number; name: string };
};

type StageReadyStudent = {
    id: string;
    name: string;
    pike13_person_id: string;
};

export async function GET() {
    try {
        const token = process.env.PIKE13_ACCESS_TOKEN;
        if (!token) {
            return new NextResponse("PIKE13_ACCESS_TOKEN is not set", {
                status: 500,
                headers: { "Content-Type": "text/plain" },
            });
        }

        // Step 1 — Load all Del Mar classes with a pike13_event_id
        const { data: classes, error: classesError } = await supabase
            .from("rock_classes")
            .select("id, name, pike13_event_id, student_ids")
            .eq("school_id", "del-mar")
            .not("pike13_event_id", "is", null);

        if (classesError) {
            return new NextResponse(`Supabase rock_classes error: ${classesError.message}`, {
                status: 500,
                headers: { "Content-Type": "text/plain" },
            });
        }

        const today = new Date().toISOString().slice(0, 10);

        // Step 2 — For each class, find earliest upcoming session with an occurrence ID
        const classesWithOccurrences: {
            cls: RockClass;
            occurrenceId: string;
            sessionDate: string;
        }[] = [];

        for (const cls of (classes ?? []) as RockClass[]) {
            const { data: sessionRows } = await supabase
                .from("class_sessions")
                .select("pike13_event_occurrence_id, session_date")
                .eq("class_id", cls.id)
                .gte("session_date", today)
                .not("pike13_event_occurrence_id", "is", null)
                .order("session_date", { ascending: true })
                .limit(1);

            const session = (sessionRows ?? [])[0] as ClassSession | undefined;
            if (session?.pike13_event_occurrence_id) {
                classesWithOccurrences.push({
                    cls,
                    occurrenceId: session.pike13_event_occurrence_id,
                    sessionDate: session.session_date,
                });
            }
        }

        // Step 3 — Load all Del Mar students with pike13_person_id
        const { data: studentRows, error: studentsError } = await supabase
            .from("students")
            .select("id, name, pike13_person_id")
            .eq("school_id", "del-mar")
            .not("pike13_person_id", "is", null);

        if (studentsError) {
            return new NextResponse(`Supabase students error: ${studentsError.message}`, {
                status: 500,
                headers: { "Content-Type": "text/plain" },
            });
        }

        const personIdToStudent = new Map<string, StageReadyStudent>();
        for (const s of (studentRows ?? []) as StageReadyStudent[]) {
            personIdToStudent.set(String(s.pike13_person_id), s);
        }

        // Step 4 — Fetch visits, match students, write to rock_classes.student_ids
        let classesUpdated = 0;
        let totalStudentsEnrolled = 0;
        const failed: { class_id: string; class_name: string; error: string }[] = [];

        for (let i = 0; i < classesWithOccurrences.length; i++) {
            if (i > 0) await sleep(300);

            const { cls, occurrenceId } = classesWithOccurrences[i];

            const res = await fetch(
                `${PIKE13_BASE}/api/v2/desk/event_occurrences/${occurrenceId}/visits.json`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) {
                const text = await res.text();
                failed.push({
                    class_id: cls.id,
                    class_name: cls.name,
                    error: `Pike13 visits fetch failed (${res.status}): ${text.slice(0, 200)}`,
                });
                continue;
            }

            const data = await res.json();
            const visits: Visit[] = (data.visits ?? []).filter(
                (v: Visit) => v.state === "registered"
            );

            const registeredPersonIds = [...new Set(visits.map((v) => String(v.person_id)))];

            const matchedUuids: string[] = [];
            for (const pid of registeredPersonIds) {
                const student = personIdToStudent.get(pid);
                if (student) matchedUuids.push(student.id);
            }

            const { error: updateError } = await supabase
                .from("rock_classes")
                .update({ student_ids: matchedUuids })
                .eq("id", cls.id);

            if (updateError) {
                failed.push({
                    class_id: cls.id,
                    class_name: cls.name,
                    error: updateError.message,
                });
            } else {
                classesUpdated++;
                totalStudentsEnrolled += matchedUuids.length;
            }
        }

        return NextResponse.json({
            classes_updated: classesUpdated,
            total_students_enrolled: totalStudentsEnrolled,
            failed,
        });

    } catch (err) {
        return new NextResponse(
            `ERROR: ${err instanceof Error ? err.message : String(err)}`,
            { status: 500, headers: { "Content-Type": "text/plain" } }
        );
    }
}
