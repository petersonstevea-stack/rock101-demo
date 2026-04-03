import { NextResponse } from "next/server";

export async function GET() {
    try {
        const token = process.env.PIKE13_ACCESS_TOKEN;
        if (!token) {
            return new NextResponse("PIKE13_ACCESS_TOKEN is not set", {
                status: 500,
                headers: { "Content-Type": "text/plain" },
            });
        }

        const res = await fetch(
            "https://delmar-sor.pike13.com/api/v2/desk/services.json",
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const text = await res.text();

        return new NextResponse(`STATUS: ${res.status}\n\nRESPONSE:\n${text}`, {
            headers: { "Content-Type": "text/plain" },
        });

    } catch (err) {
        return new NextResponse(
            `ERROR: ${err instanceof Error ? err.message : String(err)}`,
            { status: 500, headers: { "Content-Type": "text/plain" } }
        );
    }
}
