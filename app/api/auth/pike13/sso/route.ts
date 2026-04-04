import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://rock101stageready.com";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const schoolSlug = searchParams.get("school") ?? "del-mar";

    const { data: school } = await supabaseAdmin
        .from("schools")
        .select("pike13_subdomain")
        .eq("id", schoolSlug)
        .maybeSingle();

    if (!school?.pike13_subdomain) {
        return NextResponse.redirect(
            `${SITE_URL}/?sso_error=school_not_configured`
        );
    }

    const params = new URLSearchParams({
        client_id: process.env.PIKE13_CLIENT_ID!,
        redirect_uri: `${SITE_URL}/api/auth/pike13/callback`,
        response_type: "code",
    });

    const authorizeUrl = `https://${school.pike13_subdomain}.pike13.com/oauth/authorize?${params}`;

    return NextResponse.redirect(authorizeUrl);
}
