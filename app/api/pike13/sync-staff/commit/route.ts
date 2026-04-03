import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SYSTEM_EMAIL_PATTERNS = ["it@", "it+", "it-", "it_"];

const isSystemAccount = (email: string) =>
    email?.endsWith("@schoolofrock.com") &&
    SYSTEM_EMAIL_PATTERNS.some((p) => email.startsWith(p));

export async function GET() {
    try {
        // ── 1. Fetch Pike13 staff ────────────────────────────────────────────
        const token = process.env.PIKE13_ACCESS_TOKEN;
        if (!token) {
            return NextResponse.json({ error: "PIKE13_ACCESS_TOKEN is not set" }, { status: 500 });
        }

        const pike13Res = await fetch(
            "https://delmar-sor.pike13.com/api/v2/desk/staff_members",
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!pike13Res.ok) {
            const text = await pike13Res.text();
            return NextResponse.json({ error: "Pike13 fetch failed", status: pike13Res.status, body: text }, { status: 502 });
        }

        const pike13Data = await pike13Res.json();
        const allPike13Staff: any[] = pike13Data.staff_members ?? pike13Data.people ?? [];

        // ── 2 & 3. Filter system accounts and deleted/hidden staff ───────────
        const skippedSystem: { name: string; email: string }[] = [];
        const activePike13Staff: any[] = [];

        for (const p of allPike13Staff) {
            const email: string = p.email ?? "";
            const name: string = p.name ?? "";

            if (p.deleted_at || p.hidden_at) continue;

            if (isSystemAccount(email)) {
                skippedSystem.push({ name, email });
                continue;
            }

            activePike13Staff.push(p);
        }

        // ── 5. Fetch Supabase staff ──────────────────────────────────────────
        const { data: supabaseStaff, error: supabaseError } = await supabase
            .from("staff")
            .select("id, email")
            .eq("school_slug", "del-mar");

        if (supabaseError) {
            return NextResponse.json({ error: "Supabase fetch failed", details: supabaseError.message }, { status: 500 });
        }

        // ── 6. Build lowercase email map ─────────────────────────────────────
        const supabaseByEmail = new Map<string, { id: string; email: string }>();
        for (const s of supabaseStaff ?? []) {
            if (s.email) supabaseByEmail.set(s.email.toLowerCase(), s);
        }

        // ── 7. Update matched records ────────────────────────────────────────
        const updated: { name: string; email: string; pike13_id: number; pike13_role: string }[] = [];
        const skippedNoMatch: { name: string; email: string }[] = [];

        for (const p of activePike13Staff) {
            const email: string = p.email ?? "";
            const name: string = p.name ?? "";
            const pike13Role: string = p.role ?? p.staff_role ?? "";
            const existing = supabaseByEmail.get(email.toLowerCase());

            if (!existing) {
                skippedNoMatch.push({ name, email });
                continue;
            }

            const { error: updateError } = await supabase
                .from("staff")
                .update({ pike13_person_id: p.id, pike13_role: pike13Role })
                .eq("id", existing.id);

            if (updateError) {
                return NextResponse.json({
                    error: `Update failed for ${email}`,
                    details: updateError.message,
                }, { status: 500 });
            }

            updated.push({ name, email, pike13_id: p.id, pike13_role: pike13Role });
        }

        // ── 8. Return summary ────────────────────────────────────────────────
        return NextResponse.json({
            total_updated: updated.length,
            updated,
            skipped_no_match: skippedNoMatch,
            skipped_system: skippedSystem,
        });

    } catch (err) {
        return new NextResponse(
            `ERROR: ${err instanceof Error ? err.message : String(err)}`,
            { status: 500, headers: { "Content-Type": "text/plain" } }
        );
    }
}
