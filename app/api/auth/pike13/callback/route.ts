import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://rock101stageready.com";
const PIKE13_SUBDOMAIN = "delmar-sor";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
        return NextResponse.redirect(`${SITE_URL}/?sso_error=pike13_denied`);
    }

    try {
        // Step 1: Exchange code for Pike13 access token
        const tokenRes = await fetch(
            `https://${PIKE13_SUBDOMAIN}.pike13.com/oauth/token`,
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

        // Step 2: Get the logged-in user's profile from Pike13
        const profileRes = await fetch(
            `https://${PIKE13_SUBDOMAIN}.pike13.com/api/v2/front/people/me.json`,
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
        // Pike13 returns { people: [{ email, location_id, ... }] }
        const pike13Email = profileData?.people?.[0]?.email ?? null;
        const pike13LocationId = profileData?.people?.[0]?.location_id ?? null;

        console.log(`SSO: location_id=${pike13LocationId} email=${pike13Email?.trim().toLowerCase()}`);

        if (!pike13Email) {
            return NextResponse.redirect(`${SITE_URL}/?sso_error=no_email`);
        }

        const normalizedEmail = pike13Email.trim().toLowerCase();

        // Step 3: Resolve school from location_id, then verify staff
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { data: schoolRow } = await supabaseAdmin
            .from("schools")
            .select("id, name, pike13_subdomain")
            .eq("pike13_location_id", pike13LocationId)
            .maybeSingle();

        if (!schoolRow) {
            console.error("SSO: no school found for location_id", pike13LocationId);
            return NextResponse.redirect(
                `${SITE_URL}/?sso_error=school_not_found`
            );
        }

        const { data: staffRow } = await supabaseAdmin
            .from("staff")
            .select("id, email, active")
            .ilike("email", normalizedEmail)
            .eq("active", true)
            .maybeSingle();

        if (!staffRow) {
            console.error("SSO: no active staff found for", normalizedEmail);
            return NextResponse.redirect(
                `${SITE_URL}/?sso_error=not_authorized`
            );
        }

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

        // Step 4: Ensure user exists in Supabase Auth
        // createUser with email_confirm:true is safe to call even if the user
        // already exists — it returns an error we can ignore
        const { error: createError } =
            await supabaseAdmin.auth.admin.createUser({
                email: normalizedEmail,
                email_confirm: true,
            });

        // Ignore "User already registered" error
        if (createError && !createError.message.includes("already")) {
            console.error("SSO: createUser error:", createError.message);
            return NextResponse.redirect(
                `${SITE_URL}/?sso_error=create_user_failed`
            );
        }

        // Step 5: Generate one-time Supabase magic link
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

        // Step 6: Redirect user to Supabase magic link
        // This sets the Supabase session, then redirects to SITE_URL
        // Rock101App.tsx getUser() on mount picks up the session
        return NextResponse.redirect(linkData.properties.action_link);
    } catch (err) {
        console.error("SSO callback error:", err);
        return NextResponse.redirect(`${SITE_URL}/?sso_error=unexpected`);
    }
}
