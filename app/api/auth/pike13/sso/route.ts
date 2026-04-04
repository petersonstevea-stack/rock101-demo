import { NextRequest, NextResponse } from "next/server";

const subdomainMap: Record<string, string> = {
    "del-mar": "delmar-sor",
    "encinitas": "encinitas-sor",
    "scripps-ranch": "scrippsranch-sor",
};

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const school = searchParams.get("school") ?? "del-mar";
    const subdomain = subdomainMap[school] ?? "delmar-sor";

    const params = new URLSearchParams({
        client_id: process.env.PIKE13_CLIENT_ID!,
        redirect_uri: "https://rock101stageready.com/api/auth/pike13/callback",
        response_type: "code",
    });

    const authorizeUrl = `https://${subdomain}.pike13.com/oauth/authorize?${params}`;

    return NextResponse.redirect(authorizeUrl);
}
