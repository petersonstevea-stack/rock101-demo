import { serve } from "std/http/server";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const SONG_READINESS_LABELS: Record<number, string> = {
  1: "Just Starting",
  2: "Getting There",
  3: "Almost Ready",
  4: "Show Ready",
  5: "Performance Ready",
};

const DAY_OF_WEEK_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function countRemainingRehearsals(
  dayOfWeek: string | null,
  performanceDate: string | null,
): number | null {
  if (!dayOfWeek || !performanceDate) return null;
  const targetDay = DAY_OF_WEEK_MAP[dayOfWeek.toLowerCase()];
  if (targetDay === undefined) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const perf = new Date(performanceDate);
  perf.setHours(0, 0, 0, 0);
  if (perf <= today) return 0;

  let count = 0;
  const d = new Date(today);
  d.setDate(d.getDate() + 1);
  while (d <= perf) {
    if (d.getDay() === targetDay) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function progressBar(percent: number): string {
  const clamped = Math.max(0, Math.min(100, percent));
  return `
    <div style="background:#333333;height:6px;width:100%;margin-top:6px;">
      <div style="background:#cc0000;height:6px;width:${clamped}%;"></div>
    </div>`;
}

serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    const { studentId } = await req.json();
    if (!studentId) {
      return new Response(
        JSON.stringify({ error: "studentId is required" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase environment variables" }),
        { status: 500, headers: corsHeaders },
      );
    }
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing RESEND_API_KEY environment variable" }),
        { status: 500, headers: corsHeaders },
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Query A — student record
    const { data: student, error: studentError } = await admin
      .from("students")
      .select("first_name, last_initial, instrument, school_id, curriculum, notes, parent_email")
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      return new Response(
        JSON.stringify({ error: `Student not found: ${studentError?.message}` }),
        { status: 404, headers: corsHeaders },
      );
    }
    if (!student.parent_email) {
      return new Response(
        JSON.stringify({ error: "Student has no parent email on record" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const curriculum: Record<string, { done?: boolean; signed?: boolean; date?: string; highFives?: number }> =
      student.curriculum ?? {};

    // Queries B–G in parallel (B/C/D/E/F run together; G also parallel)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: methodLessons },
      { data: lessonMonths },
      { data: graduationReqs },
      { data: rehearsalBehaviors },
      { data: classRows },
      { data: songReadinessRows },
    ] = await Promise.all([
      // B — method lessons
      admin
        .from("method_lessons")
        .select("id, title, lesson_order")
        .eq("instrument", student.instrument)
        .eq("is_active", true)
        .order("lesson_order"),
      // C — lesson months
      admin
        .from("rock101_method_lesson_months")
        .select("lesson_id, month"),
      // D — graduation requirements
      admin
        .from("rock101_graduation_requirements")
        .select("id, label, allowed_signer, required, month, sort_order")
        .eq("instrument", student.instrument)
        .eq("is_active", true)
        .order("month")
        .order("sort_order"),
      // E — rehearsal behaviors
      admin
        .from("rock101_rehearsal_behaviors")
        .select("id, label, required_high_fives, sort_order")
        .eq("is_active", true)
        .order("sort_order"),
      // F — student's class
      admin
        .from("rock_classes")
        .select("id, name, performance_date, performance_title, day_of_week")
        .eq("school_id", student.school_id)
        .contains("student_ids", [studentId])
        .limit(1),
      // G — recent song readiness
      admin
        .from("session_song_readiness")
        .select("song_name, readiness, recorded_at")
        .eq("student_id", studentId)
        .gte("recorded_at", thirtyDaysAgo)
        .order("song_name")
        .order("recorded_at", { ascending: false }),
    ]);

    const rockClass = classRows?.[0] ?? null;
    const lessons = methodLessons ?? [];
    const months = lessonMonths ?? [];
    const gradReqs = graduationReqs ?? [];
    const behaviors = rehearsalBehaviors ?? [];
    const songRows = songReadinessRows ?? [];

    // Build lesson month lookup: lessonId → month number
    const lessonMonthMap: Record<string, number> = {};
    for (const m of months) {
      lessonMonthMap[m.lesson_id] = m.month;
    }

    // Derived values
    const totalHighFives = Object.values(curriculum).reduce(
      (sum, item) => sum + (item.highFives ?? 0), 0,
    );
    const lessonsCompleted = Object.values(curriculum).filter((i) => i.done).length;
    const lessonsSigned = Object.values(curriculum).filter((i) => i.signed).length;
    const totalLessons = lessons.length;
    const progressPercent = totalLessons > 0
      ? Math.round((lessonsSigned / totalLessons) * 100)
      : 0;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const completedThisWeek: string[] = Object.entries(curriculum)
      .filter(([, item]) => item.signed && item.date && item.date >= sevenDaysAgo)
      .map(([key]) => {
        const lesson = lessons.find((l) => l.id === key);
        return lesson?.title ?? key;
      });

    const rehearsalsRemaining = countRemainingRehearsals(
      rockClass?.day_of_week ?? null,
      rockClass?.performance_date ?? null,
    );

    // Song readiness — most recent score per song
    const songReadinessByName: Record<string, number> = {};
    for (const row of songRows) {
      if (!(row.song_name in songReadinessByName)) {
        songReadinessByName[row.song_name] = row.readiness;
      }
    }

    // Graduation requirements — group by month
    const gradByMonth: Record<number, typeof gradReqs> = {};
    for (const req of gradReqs) {
      const m = req.month ?? 0;
      if (!gradByMonth[m]) gradByMonth[m] = [];
      gradByMonth[m].push(req);
    }

    // Notes
    const lessonNotes: string = student.notes?.instructor ?? "";
    const rehearsalNotes: string = student.notes?.director ?? "";
    const studentName = `${student.first_name} ${student.last_initial ?? ""}`.trim();
    const weekLabel = new Date().toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });

    // ── HTML EMAIL ──────────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Rock 101 Weekly Progress — ${studentName}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:#cc0000;padding:28px 32px;">
              <div style="font-size:11px;font-weight:400;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:6px;">Rock 101 Weekly Progress</div>
              <div style="font-size:26px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.05em;">${studentName}</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">Week of ${weekLabel}${student.instrument ? ` &nbsp;&bull;&nbsp; ${student.instrument.charAt(0).toUpperCase() + student.instrument.slice(1)}` : ""}</div>
            </td>
          </tr>

          <!-- OVERALL PROGRESS -->
          <tr>
            <td style="background:#111111;padding:24px 32px;border-top:1px solid #1a1a1a;">
              <div style="font-size:11px;font-weight:400;letter-spacing:0.2em;text-transform:uppercase;color:#999999;margin-bottom:12px;">Overall Progress</div>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="33%" style="text-align:center;background:#1a1a1a;padding:14px 8px;">
                    <div style="font-size:28px;font-weight:700;color:#cc0000;">${progressPercent}%</div>
                    <div style="font-size:11px;color:#999999;margin-top:2px;text-transform:uppercase;letter-spacing:0.1em;">Complete</div>
                    ${progressBar(progressPercent)}
                  </td>
                  <td width="4px"></td>
                  <td width="33%" style="text-align:center;background:#1a1a1a;padding:14px 8px;">
                    <div style="font-size:28px;font-weight:700;color:#ffffff;">${lessonsSigned}<span style="font-size:14px;color:#999999;">/${totalLessons}</span></div>
                    <div style="font-size:11px;color:#999999;margin-top:2px;text-transform:uppercase;letter-spacing:0.1em;">Lessons Signed</div>
                  </td>
                  <td width="4px"></td>
                  <td width="33%" style="text-align:center;background:#1a1a1a;padding:14px 8px;">
                    <div style="font-size:28px;font-weight:700;color:#ffffff;">${totalHighFives}</div>
                    <div style="font-size:11px;color:#999999;margin-top:2px;text-transform:uppercase;letter-spacing:0.1em;">High Fives</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${completedThisWeek.length > 0 ? `
          <!-- COMPLETED THIS WEEK -->
          <tr>
            <td style="background:#111111;padding:0 32px 24px 32px;border-top:1px solid #1a1a1a;">
              <div style="font-size:11px;font-weight:400;letter-spacing:0.2em;text-transform:uppercase;color:#999999;margin-bottom:10px;">Completed This Week</div>
              ${completedThisWeek.map((title) => `
              <div style="background:#1a1a1a;padding:10px 14px;margin-bottom:4px;border-left:2px solid #cc0000;">
                <span style="font-size:14px;color:#ffffff;">${title}</span>
              </div>`).join("")}
            </td>
          </tr>` : ""}

          <!-- PRIVATE LESSON NOTES -->
          <tr>
            <td style="background:#111111;padding:24px 32px;border-top:1px solid #1a1a1a;">
              <div style="font-size:11px;font-weight:400;letter-spacing:0.2em;text-transform:uppercase;color:#999999;margin-bottom:10px;">Private Lesson Notes</div>
              ${lessonNotes.trim()
                ? `<div style="background:#1a1a1a;padding:16px 18px;border-left:2px solid #cc0000;font-size:14px;line-height:1.7;color:#ffffff;white-space:pre-wrap;">${lessonNotes.trim()}</div>`
                : `<div style="color:#999999;font-style:italic;font-size:14px;">No lesson notes this week.</div>`}
            </td>
          </tr>

          <!-- GROUP REHEARSAL NOTES -->
          <tr>
            <td style="background:#111111;padding:24px 32px;border-top:1px solid #1a1a1a;">
              <div style="font-size:11px;font-weight:400;letter-spacing:0.2em;text-transform:uppercase;color:#999999;margin-bottom:10px;">Group Rehearsal Notes</div>
              ${rehearsalNotes.trim()
                ? `<div style="background:#1a1a1a;padding:16px 18px;border-left:2px solid #cc0000;font-size:14px;line-height:1.7;color:#ffffff;white-space:pre-wrap;">${rehearsalNotes.trim()}</div>`
                : `<div style="color:#999999;font-style:italic;font-size:14px;">No rehearsal notes this week.</div>`}
            </td>
          </tr>

          ${behaviors.length > 0 ? `
          <!-- REHEARSAL BEHAVIORS -->
          <tr>
            <td style="background:#111111;padding:24px 32px;border-top:1px solid #1a1a1a;">
              <div style="font-size:11px;font-weight:400;letter-spacing:0.2em;text-transform:uppercase;color:#999999;margin-bottom:12px;">Rehearsal Behaviors</div>
              ${behaviors.map((b) => {
                const earned = curriculum[b.id]?.highFives ?? 0;
                const required = b.required_high_fives ?? 10;
                const pct = Math.round(Math.min(earned, required) / required * 100);
                return `
              <div style="background:#1a1a1a;padding:12px 14px;margin-bottom:4px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-size:13px;color:#ffffff;">${b.label}</td>
                    <td align="right" style="font-size:12px;color:#cc0000;white-space:nowrap;">${earned} / ${required} high fives</td>
                  </tr>
                </table>
                ${progressBar(pct)}
              </div>`;
              }).join("")}
            </td>
          </tr>` : ""}

          ${Object.keys(songReadinessByName).length > 0 ? `
          <!-- SONG READINESS -->
          <tr>
            <td style="background:#111111;padding:24px 32px;border-top:1px solid #1a1a1a;">
              <div style="font-size:11px;font-weight:400;letter-spacing:0.2em;text-transform:uppercase;color:#999999;margin-bottom:12px;">Song Readiness</div>
              ${Object.entries(songReadinessByName).map(([song, level]) => `
              <div style="background:#1a1a1a;padding:12px 14px;margin-bottom:4px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-size:13px;color:#ffffff;">${song}</td>
                    <td align="right" style="font-size:12px;color:#cc0000;">${SONG_READINESS_LABELS[level] ?? level}</td>
                  </tr>
                </table>
                ${progressBar(Math.round((level / 5) * 100))}
              </div>`).join("")}
            </td>
          </tr>` : ""}

          ${rockClass ? `
          <!-- SHOW INFO -->
          <tr>
            <td style="background:#111111;padding:24px 32px;border-top:1px solid #1a1a1a;">
              <div style="font-size:11px;font-weight:400;letter-spacing:0.2em;text-transform:uppercase;color:#999999;margin-bottom:12px;">Show Info</div>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${rockClass.performance_title ? `
                <tr>
                  <td style="background:#1a1a1a;padding:12px 14px;margin-bottom:4px;">
                    <div style="font-size:11px;color:#999999;text-transform:uppercase;letter-spacing:0.1em;">Performance</div>
                    <div style="font-size:15px;font-weight:700;color:#ffffff;margin-top:4px;">${rockClass.performance_title}</div>
                    ${rockClass.performance_date ? `<div style="font-size:13px;color:#999999;margin-top:2px;">${new Date(rockClass.performance_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>` : ""}
                  </td>
                </tr>` : ""}
                ${rehearsalsRemaining !== null ? `
                <tr>
                  <td style="padding-top:4px;">
                    <div style="background:#1a1a1a;padding:12px 14px;">
                      <div style="font-size:11px;color:#999999;text-transform:uppercase;letter-spacing:0.1em;">Rehearsals Remaining</div>
                      <div style="font-size:24px;font-weight:700;color:#cc0000;margin-top:4px;">${rehearsalsRemaining}</div>
                    </div>
                  </td>
                </tr>` : ""}
              </table>
            </td>
          </tr>` : ""}

          ${gradReqs.length > 0 ? `
          <!-- GRADUATION REQUIREMENTS -->
          <tr>
            <td style="background:#111111;padding:24px 32px;border-top:1px solid #1a1a1a;">
              <div style="font-size:11px;font-weight:400;letter-spacing:0.2em;text-transform:uppercase;color:#999999;margin-bottom:12px;">Graduation Requirements</div>
              ${Object.entries(gradByMonth).sort(([a], [b]) => Number(a) - Number(b)).map(([month, reqs]) => `
              <div style="margin-bottom:12px;">
                <div style="font-size:11px;color:#cc0000;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:6px;">Month ${month}</div>
                ${reqs.map((req) => {
                  const progress = curriculum[req.id];
                  const done = progress?.done ?? false;
                  const signed = progress?.signed ?? false;
                  const statusColor = signed ? "#cc0000" : done ? "#ffffff" : "#333333";
                  const statusLabel = signed ? "Signed" : done ? "Done" : "Not started";
                  return `
                <div style="background:#1a1a1a;padding:10px 14px;margin-bottom:3px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-size:13px;color:${done || signed ? "#ffffff" : "#999999"};">${req.label}</td>
                      <td align="right" style="font-size:11px;color:${statusColor};white-space:nowrap;">${statusLabel}</td>
                    </tr>
                  </table>
                </div>`;
                }).join("")}
              </div>`).join("")}
            </td>
          </tr>` : ""}

          <!-- FOOTER -->
          <tr>
            <td style="background:#0a0a0a;padding:20px 32px;text-align:center;border-top:1px solid #1a1a1a;">
              <div style="font-size:11px;color:#444444;text-transform:uppercase;letter-spacing:0.15em;">Stage Ready &mdash; School of Rock</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "progress@rock101stageready.com",
        to: [student.parent_email],
        subject: `Rock 101 Weekly Progress — ${studentName}`,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorBody = await emailResponse.text();
      return new Response(
        JSON.stringify({ error: `Resend error: ${errorBody}` }),
        { status: 502, headers: corsHeaders },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: corsHeaders },
    );
  }
});
