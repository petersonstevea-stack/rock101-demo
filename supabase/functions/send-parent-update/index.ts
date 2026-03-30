import { serve } from "std/http/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    const { parentEmail, studentName, lessonNotes, rehearsalNotes } =
      await req.json();

    if (!parentEmail || !studentName) {
      return new Response(
        JSON.stringify({ error: "parentEmail and studentName are required" }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing RESEND_API_KEY environment variable" }),
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    const weekLabel = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
      .header { background: #c0392b; padding: 24px 32px; }
      .header h1 { color: #ffffff; margin: 0; font-size: 22px; }
      .header p { color: #f5b7b1; margin: 6px 0 0; font-size: 14px; }
      .body { padding: 32px; }
      .section { margin-bottom: 28px; }
      .section h2 { font-size: 16px; color: #c0392b; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 10px; }
      .notes { background: #f9f9f9; border-left: 4px solid #c0392b; padding: 14px 18px; border-radius: 4px; color: #333333; font-size: 15px; line-height: 1.6; white-space: pre-wrap; }
      .no-notes { color: #999999; font-style: italic; font-size: 14px; }
      .footer { background: #f4f4f4; padding: 18px 32px; text-align: center; font-size: 12px; color: #999999; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Rock 101 Weekly Progress</h1>
        <p>${studentName} &mdash; Week of ${weekLabel}</p>
      </div>
      <div class="body">
        <div class="section">
          <h2>Private Lesson Notes</h2>
          ${
            lessonNotes?.trim()
              ? `<div class="notes">${lessonNotes.trim()}</div>`
              : `<div class="no-notes">No lesson notes this week.</div>`
          }
        </div>
        <div class="section">
          <h2>Group Rehearsal Notes</h2>
          ${
            rehearsalNotes?.trim()
              ? `<div class="notes">${rehearsalNotes.trim()}</div>`
              : `<div class="no-notes">No rehearsal notes this week.</div>`
          }
        </div>
      </div>
      <div class="footer">
        Stage Ready &mdash; School of Rock
      </div>
    </div>
  </body>
</html>
`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "progress@rock101stageready.com",
        to: [parentEmail],
        subject: `Rock 101 Weekly Progress — ${studentName}`,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorBody = await emailResponse.text();
      return new Response(
        JSON.stringify({ error: `Resend error: ${errorBody}` }),
        {
          status: 502,
          headers: corsHeaders,
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});
