import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://rock101stageready.com";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state") ?? "del-mar";

    if (error || !code) {
        return NextResponse.redirect(`${SITE_URL}/?sso_error=pike13_denied`);
    }

    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Step 1: Resolve school from state param (slug) before token exchange
        const { data: schoolRow } = await supabaseAdmin
            .from("schools")
            .select("id, name, pike13_subdomain, pike13_location_id, feature_parent_sso")
            .eq("id", state)
            .maybeSingle();

        if (!schoolRow?.pike13_subdomain) {
            return NextResponse.redirect(
                `${SITE_URL}/?sso_error=school_not_configured`
            );
        }

        // Step 2: Exchange code for Pike13 access token
        const tokenRes = await fetch(
            `https://${schoolRow.pike13_subdomain}.pike13.com/oauth/token`,
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    grant_type: "authorization_code",
                    client_id: process.env.PIKE13_CLIENT_ID!,
                    client_secret: process.env.PIKE13_CLIENT_SECRET!,
                    redirect_uri: `${SITE_URL}/api/auth/pike13/callback`,
                    code,
                }),
            }
        );

        if (!tokenRes.ok) {
            console.error("Pike13 token exchange failed:", tokenRes.status);
            return NextResponse.redirect(
                `${SITE_URL}/?sso_error=token_exchange_failed`
            );
        }

        const tokenData = await tokenRes.json();
        const pike13Token = tokenData.access_token;

        if (!pike13Token) {
            return NextResponse.redirect(`${SITE_URL}/?sso_error=no_token`);
        }

        // Step 3: Get the logged-in user's profile from Pike13
        const profileRes = await fetch(
            `https://${schoolRow.pike13_subdomain}.pike13.com/api/v2/front/people/me.json`,
            {
                headers: { Authorization: `Bearer ${pike13Token}` },
            }
        );

        if (!profileRes.ok) {
            console.error("Pike13 profile fetch failed:", profileRes.status);
            return NextResponse.redirect(
                `${SITE_URL}/?sso_error=profile_fetch_failed`
            );
        }

        const profileData = await profileRes.json();
        const pike13Email = profileData?.people?.[0]?.email ?? null;

        console.log(`SSO: school=${schoolRow.id} email=${pike13Email?.trim().toLowerCase()}`);

        if (!pike13Email) {
            return NextResponse.redirect(`${SITE_URL}/?sso_error=no_email`);
        }

        const normalizedEmail = pike13Email.trim().toLowerCase();

        // Step 4: Check for active staff record
        const { data: staffRow } = await supabaseAdmin
            .from("staff")
            .select("id, email, active")
            .ilike("email", normalizedEmail)
            .eq("active", true)
            .maybeSingle();

        // Step 5: If no staff — check parent SSO
        if (!staffRow) {
            if (!schoolRow.feature_parent_sso) {
                console.error("SSO: no active staff and parent SSO disabled for", normalizedEmail);
                return NextResponse.redirect(
                    `${SITE_URL}/?sso_error=not_authorized`
                );
            }

            const { data: studentRows } = await supabaseAdmin
                .from("students")
                .select("id, first_name, last_initial, program, school_id")
                .ilike("parent_email", normalizedEmail)
                .eq("school_id", schoolRow.id);

            if (!studentRows || studentRows.length === 0) {
                console.error("SSO: no students found for parent", normalizedEmail);
                return NextResponse.redirect(
                    `${SITE_URL}/?sso_error=not_authorized`
                );
            }

            const studentsArray = studentRows.map((s) => ({
                student_id: s.id,
                student_name: `${s.first_name} ${s.last_initial}.`,
                program: s.program,
            }));

            const { error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: normalizedEmail,
                email_confirm: true,
            });

            if (createError && !createError.message.includes("already")) {
                console.error("SSO: createUser error:", createError.message);
                return NextResponse.redirect(
                    `${SITE_URL}/?sso_error=create_user_failed`
                );
            }

            const { data: linkData, error: linkError } =
                await supabaseAdmin.auth.admin.generateLink({
                    type: "magiclink",
                    email: normalizedEmail,
                    options: {
                        redirectTo: SITE_URL,
                        data: {
                            role: "parent",
                            school_id: schoolRow.id,
                            students: studentsArray,
                        },
                    },
                });

            if (linkError || !linkData?.properties?.action_link) {
                console.error("SSO: generateLink error:", linkError?.message);
                return NextResponse.redirect(
                    `${SITE_URL}/?sso_error=link_generation_failed`
                );
            }

            return NextResponse.redirect(linkData.properties.action_link);
        }

        // Step 6: Verify staff has an active role at this school
        const { data: roleRow } = await supabaseAdmin
            .from("staff_school_roles")
            .select("school_slug, role")
            .eq("staff_id", staffRow.id)
            .eq("school_slug", schoolRow.id)
            .eq("active", true)
            .maybeSingle();

        if (!roleRow) {
            console.error("SSO: no active role at school", schoolRow.id, "for", normalizedEmail);
            return NextResponse.redirect(
                `${SITE_URL}/?sso_error=not_authorized`
            );
        }

        // Step 7: Ensure user exists in Supabase Auth
        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            email_confirm: true,
        });

        if (createError && !createError.message.includes("already")) {
            console.error("SSO: createUser error:", createError.message);
            return NextResponse.redirect(
                `${SITE_URL}/?sso_error=create_user_failed`
            );
        }

        // Step 8: Generate one-time Supabase magic link
        const { data: linkData, error: linkError } =
            await supabaseAdmin.auth.admin.generateLink({
                type: "magiclink",
                email: normalizedEmail,
                options: { redirectTo: SITE_URL },
            });

        if (linkError || !linkData?.properties?.action_link) {
            console.error("SSO: generateLink error:", linkError?.message);
            return NextResponse.redirect(
                `${SITE_URL}/?sso_error=link_generation_failed`
            );
        }

        return NextResponse.redirect(linkData.properties.action_link);
    } catch (err) {
        console.error("SSO callback error:", err);
        return NextResponse.redirect(`${SITE_URL}/?sso_error=unexpected`);
    }
}
