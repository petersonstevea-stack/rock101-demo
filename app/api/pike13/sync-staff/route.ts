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
    const token = process.env.PIKE13_ACCESS_TOKEN;
    if (!token) {
        return NextResponse.json({ error: "PIKE13_ACCESS_TOKEN is not set" }, { status: 500 });
    }

    // ── 1. Fetch Pike13 staff ────────────────────────────────────────────────
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

    // ── 2 & 3. Filter system accounts and deleted/hidden staff ───────────────
    const skipped: { name: string; email: string; reason: string }[] = [];
    const activePike13Staff: any[] = [];

    for (const p of allPike13Staff) {
        const email: string = p.email ?? "";
        const name: string = p.name ?? "";

        if (p.deleted_at) {
            skipped.push({ name, email, reason: "deleted_at set" });
            continue;
        }
        if (p.hidden_at) {
            skipped.push({ name, email, reason: "hidden_at set" });
            continue;
        }
        if (isSystemAccount(email)) {
            skipped.push({ name, email, reason: "system account" });
            continue;
        }
        activePike13Staff.push(p);
    }

    // ── 4. Fetch Supabase staff ──────────────────────────────────────────────
    const { data: supabaseStaff, error: supabaseError } = await supabase
        .from("staff")
        .select("id, name, email, pike13_person_id, pike13_role, active")
        .eq("school_slug", "del-mar");

    if (supabaseError) {
        return NextResponse.json({ error: "Supabase fetch failed", details: supabaseError.message }, { status: 500 });
    }

    const supabaseByEmail = new Map<string, any>();
    for (const s of supabaseStaff ?? []) {
        if (s.email) supabaseByEmail.set(s.email.toLowerCase(), s);
    }

    // ── 5. Categorize ────────────────────────────────────────────────────────
    const willUpdate: any[] = [];
    const willCreate: any[] = [];

    for (const p of activePike13Staff) {
        const email: string = p.email ?? "";
        const existing = supabaseByEmail.get(email.toLowerCase());
        const pike13Role: string = p.role ?? p.staff_role ?? "";

        if (existing) {
            willUpdate.push({
                pike13_id: p.id,
                name: p.name,
                email,
                pike13_role: pike13Role,
                supabase_id: existing.id,
                changes: {
                    pike13_person_id: p.id,
                    pike13_role: pike13Role,
                },
            });
        } else {
            willCreate.push({
                pike13_id: p.id,
                name: p.name,
                email,
                pike13_role: pike13Role,
            });
        }
    }

    // ── 6. Return summary ────────────────────────────────────────────────────
    return NextResponse.json(
        {
            summary: {
                pike13_total: allPike13Staff.length,
                skipped: skipped.length,
                will_update: willUpdate.length,
                will_create: willCreate.length,
            },
            will_update: willUpdate,
            will_create: willCreate,
            skipped,
        },
        { status: 200 }
    );
  } catch (err) {
    return new NextResponse(
      `ERROR: ${err instanceof Error ? err.message : String(err)}`,
      { status: 500, headers: { "Content-Type": "text/plain" } }
    );
  }
}
