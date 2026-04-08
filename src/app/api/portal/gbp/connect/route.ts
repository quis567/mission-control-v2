import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import prisma from '@/lib/db';
import { getPortalClientId } from '@/lib/portalSession';
import { getGbpOAuthUrl } from '@/lib/gbp';

// Start OAuth: returns a redirect URL the client should open.
export async function GET(request: NextRequest) {
  const clientId = await getPortalClientId(request);
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use a state token tied to a short-lived row to correlate the callback back to this client.
  const state = randomBytes(16).toString('hex');
  await prisma.clientMagicLink.create({
    data: {
      clientId,
      token: `gbp_state_${state}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  try {
    return NextResponse.json({ url: getGbpOAuthUrl(state) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
