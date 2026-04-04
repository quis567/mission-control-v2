import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const openclawUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
    const response = await fetch(`${openclawUrl}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return NextResponse.json({ available: response.ok });
  } catch {
    return NextResponse.json({ available: false });
  }
}
