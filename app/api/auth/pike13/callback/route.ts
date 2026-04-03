import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (!code) {
    return new NextResponse(JSON.stringify({
      error: 'No code received',
      query_params: Object.fromEntries(searchParams),
      pike13_error: error
    }, null, 2), { headers: { 'Content-Type': 'text/plain' } })
  }

  const tokenRes = await fetch('https://delmar-sor.pike13.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.PIKE13_CLIENT_ID!,
      client_secret: process.env.PIKE13_CLIENT_SECRET!,
      redirect_uri: 'https://rock101stageready.com/api/auth/pike13/callback',
      code,
    }),
  })

  const text = await tokenRes.text()
  return new NextResponse(
    `STATUS: ${tokenRes.status}\n\nRESPONSE:\n${text}`,
    { headers: { 'Content-Type': 'text/plain' } }
  )
}
