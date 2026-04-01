import { serve } from "std/http/server";
import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const SONG_LABELS: Record<number, string> = {
  1: "Just Starting", 2: "Getting There", 3: "Almost Ready",
  4: "Show Ready", 5: "Performance Ready",
};

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

const INST: Record<string, string> = {
  guitar: "Guitar", bass: "Bass", drums: "Drums",
  keys: "Keys", vocals: "Vocals",
};

function countRehearsals(day: string | null, perfDate: string | null): number | null {
  if (!day || !perfDate) return null;
  const t = DAY_MAP[day.toLowerCase()];
  if (t === undefined) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const perf = new Date(perfDate); perf.setHours(0,0,0,0);
  if (perf <= today) return 0;
  let n = 0;
  const d = new Date(today); d.setDate(d.getDate() + 1);
  while (d <= perf) { if (d.getDay() === t) n++; d.setDate(d.getDate() + 1); }
  return n;
}

function bar(pct: number, h = 6): string {
  const w = Math.max(0, Math.min(100, pct));
  return `<div style="background:#333;height:${h}px;width:100%;margin-top:8px"><div style="background:#cc0000;height:${h}px;width:${w}%"></div></div>`;
}

function statTile(value: string, sub: string, label: string, accent = false): string {
  return `<td style="background:#1a1a1a;padding:14px 8px;text-align:center">
    <div style="font-size:26px;font-weight:700;color:${accent ? "#cc0000" : "#fff"}">${value}</div>
    <div style="font-size:10px;color:#cc0000;margin-top:1px">${sub}</div>
    <div style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:.08em;margin-top:3px">${label}</div>
  </td>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });

  try {
    const body = await req.json();
    const studentId = body.studentId;
    if (!studentId) return new Response(JSON.stringify({ error: "studentId required" }), { status: 400, headers: CORS });

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resend = Deno.env.get("RESEND_API_KEY")!;

    const db = createClient(url, key, { auth: { persistSession: false } });

    const { data: student, error: sErr } = await db
      .from("students")
      .select("first_name, last_initial, instrument, school_id, curriculum, notes, parent_email")
      .eq("id", studentId).single();
    if (sErr || !student) return new Response(JSON.stringify({ error: "Student not found" }), { status: 404, headers: CORS });
    if (!student.parent_email) return new Response(JSON.stringify({ error: "No parent email" }), { status: 400, headers: CORS });

    const curriculum: Record<string, { done?: boolean; signed?: boolean; date?: string; highFives?: number }> = student.curriculum ?? {};
    const ago30 = new Date(Date.now() - 30*24*60*60*1000).toISOString();

    const [mL, lM, gR, beh, cls, sng] = await Promise.all([
      db.from("method_lessons").select("id, title, lesson_order").eq("instrument", student.instrument).eq("is_active", true).order("lesson_order"),
      db.from("rock101_method_lesson_months").select("lesson_id, month"),
      db.from("rock101_graduation_requirements").select("id, label, month, sort_order").eq("instrument", student.instrument).eq("is_active", true).order("month").order("sort_order"),
      db.from("rock101_rehearsal_behaviors").select("id, label, required_high_fives, sort_order").eq("is_active", true).order("sort_order"),
      db.from("rock_classes").select("id, name, performance_date, performance_title, day_of_week, student_ids").eq("school_id", student.school_id),
      db.from("session_song_readiness").select("song_name, readiness, recorded_at").eq("student_id", studentId).gte("recorded_at", ago30).order("song_name").order("recorded_at", { ascending: false }),
    ]);

    const lessons = mL.data ?? [];
    const monthRows = lM.data ?? [];
    const reqs = gR.data ?? [];
    const behaviors = beh.data ?? [];
    const allClasses = cls.data ?? [];
    const songRows = sng.data ?? [];

    const rockClass = allClasses.find((rc) => {
      const ids: string[] = Array.isArray(rc.student_ids) ? rc.student_ids : [];
      return ids.includes(studentId);
    }) ?? null;

    const lessonTitleById: Record<string, string> = {};
    for (const l of lessons) lessonTitleById[l.id] = l.title;

    const reqLabelById: Record<string, string> = {};
    for (const r of reqs) reqLabelById[r.id] = r.label;

    const reqIdSet = new Set(reqs.map((r: {id: string}) => r.id));
    const behaviorIdSet = new Set(behaviors.map((b: {id: string}) => b.id));

    const monthByLesson: Record<string, number> = {};
    for (const m of monthRows) monthByLesson[m.lesson_id] = m.month;

    let methodDone = 0;
    for (const id of Object.keys(lessonTitleById)) { if (curriculum[id]?.done) methodDone++; }
    for (const id of Array.from(reqIdSet)) { if (curriculum[id]?.done) methodDone++; }
    const methodTotal = lessons.length + reqs.length;
    const methodPct = methodTotal > 0 ? Math.round(methodDone / methodTotal * 100) : 0;

    let gradSigned = 0;
    for (const id of Array.from(reqIdSet)) { if (curriculum[id]?.signed) gradSigned++; }
    const gradTotal = reqs.length;
    const gradPct = gradTotal > 0 ? Math.round(gradSigned / gradTotal * 100) : 0;

    let behaviorsSigned = 0;
    for (const id of Array.from(behaviorIdSet)) { if (curriculum[id]?.signed) behaviorsSigned++; }
    const behaviorsTotal = behaviors.length;
    const behaviorsPct = behaviorsTotal > 0 ? Math.round(behaviorsSigned / behaviorsTotal * 100) : 0;

    let totalHF = 0;
    for (const item of Object.values(curriculum)) { if (item.highFives) totalHF += item.highFives; }

    const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000);
    const completedThisWeek: string[] = [];
    for (const lessonId of Object.keys(lessonTitleById)) {
      const item = curriculum[lessonId];
      if (!item || !item.signed || !item.date) continue;
      const d = new Date(item.date);
      if (isNaN(d.getTime())) continue;
      if (d >= sevenDaysAgo) completedThisWeek.push(lessonTitleById[lessonId]);
    }

    const songByName: Record<string, number> = {};
    for (const row of songRows) {
      if (!(row.song_name in songByName)) songByName[row.song_name] = row.readiness;
    }

    const recentItems: Array<{ label: string; date: Date; dateStr: string; type: string }> = [];
    for (const [key, item] of Object.entries(curriculum)) {
      if (!item.signed || !item.date) continue;
      const d = new Date(item.date);
      if (isNaN(d.getTime())) continue;
      const label = lessonTitleById[key] ?? reqLabelById[key] ?? key;
      const type = lessonTitleById[key] ? "Private Lesson" : reqLabelById[key] ? "Graduation Requirement" : "Private Lesson";
      recentItems.push({ label, date: d, dateStr: d.toLocaleDateString("en-US", { month: "long", day: "numeric" }), type });
    }
    recentItems.sort((a, b) => b.date.getTime() - a.date.getTime());
    const top5Recent = recentItems.slice(0, 5);

    const instrLabel = INST[student.instrument] ?? student.instrument ?? "";
    const studentName = `${student.first_name} ${student.last_initial ?? ""}`.trim();
    const weekLabel = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const lessonNotes = (student.notes?.instructor ?? "").trim();
    const rehearsalNotes = (student.notes?.director ?? "").trim();
    const remaining = countRehearsals(rockClass?.day_of_week ?? null, rockClass?.performance_date ?? null);
    const perfDateLabel = rockClass?.performance_date
      ? new Date(rockClass.performance_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : null;

    let remStr = "";
    if (rockClass && perfDateLabel) {
      if (remaining === 0) remStr = " &bull; <span style=\"color:#fff\">Show week!</span>";
      else if (remaining !== null) remStr = ` &bull; <span style="color:rgba(255,255,255,.7)">${remaining} rehearsal${remaining === 1 ? "" : "s"} remaining</span>`;
    }

    let html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Rock 101</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a">
<tr><td align="center" style="padding:24px 12px">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">`;

    html += `<tr><td style="background:#cc0000;padding:28px 28px 24px">
  <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.65);margin-bottom:6px">Rock 101 Weekly Progress</div>
  <div style="font-size:28px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.04em">${studentName}</div>
  <div style="font-size:13px;color:rgba(255,255,255,.7);margin-top:6px">Week of ${weekLabel}${instrLabel ? ` &bull; ${instrLabel}` : ""}</div>
  ${rockClass && perfDateLabel ? `<div style="border-top:1px solid rgba(255,255,255,.2);margin-top:14px;padding-top:14px">
    <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:5px">Upcoming Performance</div>
    <div style="font-size:15px;font-weight:700;color:#fff">${rockClass.performance_title ?? "Show"}</div>
    <div style="font-size:12px;color:rgba(255,255,255,.7);margin-top:3px">${perfDateLabel}${remStr}</div>
  </div>` : ""}
</td></tr>`;

    html += `<tr><td style="background:#111;padding:16px 28px;border-top:4px solid #0a0a0a">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    ${statTile(`${methodPct}%`, `${methodDone}/${methodTotal} complete`, "Method App Lessons", true)}
    <td width="4"></td>
    ${statTile(`${gradPct}%`, `${gradSigned}/${gradTotal} complete`, "Graduation Reqs")}
    <td width="4"></td>
    ${statTile(`${behaviorsPct}%`, `${behaviorsSigned}/${behaviorsTotal} complete`, "Group Rehearsal")}
    <td width="4"></td>
    ${statTile(`${totalHF}`, `Rockstar Habits`, "Rehearsal Awards")}
  </tr></table>
</td></tr>`;

    if (completedThisWeek.length > 0) {
      html += `<tr><td style="background:#111;padding:24px 28px;border-top:4px solid #0a0a0a">
  <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#999;margin-bottom:12px">Completed This Week</div>`;
      for (const title of completedThisWeek) {
        html += `<div style="background:#1a1a1a;padding:10px 14px;margin-bottom:3px;border-left:2px solid #cc0000"><span style="font-size:13px;color:#fff">&#10003; ${title}</span></div>`;
      }
      html += `</td></tr>`;
    }

    html += `<tr><td style="background:#111;padding:24px 28px;border-top:4px solid #0a0a0a">
  <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#999;margin-bottom:12px">Private Lesson Notes</div>
  ${lessonNotes ? `<div style="background:#1a1a1a;padding:14px 16px;border-left:2px solid #cc0000;font-size:14px;line-height:1.7;color:#fff">${lessonNotes}</div>` : `<div style="color:#666;font-style:italic;font-size:13px">No lesson notes this week.</div>`}
</td></tr>`;

    html += `<tr><td style="background:#111;padding:24px 28px;border-top:4px solid #0a0a0a">
  <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#999;margin-bottom:12px">Group Rehearsal Notes</div>
  ${rehearsalNotes ? `<div style="background:#1a1a1a;padding:14px 16px;border-left:2px solid #cc0000;font-size:14px;line-height:1.7;color:#fff">${rehearsalNotes}</div>` : `<div style="color:#666;font-style:italic;font-size:13px">No rehearsal notes this week.</div>`}
</td></tr>`;

    if (behaviors.length > 0) {
      html += `<tr><td style="background:#111;padding:24px 28px;border-top:4px solid #0a0a0a">
  <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#999;margin-bottom:12px">Rockstar Habits</div>`;
      for (const b of behaviors) {
        const earned = curriculum[b.id]?.highFives ?? 0;
        const req = b.required_high_fives ?? 10;
        const p = Math.round(Math.min(earned, req) / req * 100);
        html += `<div style="background:#1a1a1a;padding:12px 14px;margin-bottom:3px"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:13px;color:#fff">${b.label}</td><td align="right" style="font-size:11px;color:#cc0000;white-space:nowrap">${earned} / ${req} Awards</td></tr></table>${bar(p, 4)}</div>`;
      }
      html += `</td></tr>`;
    }

    html += `<tr><td style="background:#111;padding:24px 28px;border-top:4px solid #0a0a0a">
  <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#999;margin-bottom:12px">Song Progress</div>`;
    const songEntries = Object.entries(songByName);
    if (songEntries.length > 0) {
      for (const [song, level] of songEntries) {
        html += `<div style="background:#1a1a1a;padding:12px 14px;margin-bottom:3px"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:13px;color:#fff">${song}</td><td align="right" style="font-size:11px;color:#cc0000">${SONG_LABELS[level] ?? level + "/5"}</td></tr></table>${bar(Math.round(level / 5 * 100), 4)}</div>`;
      }
    } else {
      html += `<div style="color:#666;font-style:italic;font-size:13px">No song readiness recorded yet.</div>`;
    }
    html += `</td></tr>`;

    html += `<tr><td style="background:#111;padding:24px 28px;border-top:4px solid #0a0a0a">
  <div style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#999;margin-bottom:12px">Recent Activity</div>`;
    if (top5Recent.length > 0) {
      for (const entry of top5Recent) {
        html += `<div style="background:#1a1a1a;padding:10px 14px;margin-bottom:3px;border-left:2px solid #cc0000"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:13px;color:#fff">${entry.label}</td><td align="right" style="font-size:11px;color:#999;white-space:nowrap">${entry.dateStr}</td></tr><tr><td style="font-size:10px;color:#cc0000;padding-top:2px">${entry.type}</td><td></td></tr></table></div>`;
      }
    } else {
      html += `<div style="color:#666;font-style:italic;font-size:13px">No signed items yet.</div>`;
    }
    html += `</td></tr>`;

    html += `<tr><td style="background:#0a0a0a;padding:20px 28px;text-align:center;border-top:4px solid #111">
  <div style="font-size:10px;color:#333;text-transform:uppercase;letter-spacing:.2em">Stage Ready &mdash; School of Rock</div>
</td></tr>`;

    html += `</table></td></tr></table></body></html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resend}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "progress@rock101stageready.com",
        to: [student.parent_email],
        subject: `Rock 101 Weekly Progress \u2014 ${studentName}`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      return new Response(JSON.stringify({ error: `Resend: ${err}` }), { status: 502, headers: CORS });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
});
