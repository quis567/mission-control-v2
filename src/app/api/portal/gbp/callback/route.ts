import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { exchangeGbpCode } from '@/lib/gbp';

// OAuth callback from Google.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) return NextResponse.redirect(new URL(`/portal?gbp=error&reason=${error}`, request.url));
  if (!code || !state) return NextResponse.redirect(new URL('/portal?gbp=error&reason=missing', request.url));

  // Look up the state token to find which client initiated this flow.
  const stateRecord = await prisma.clientMagicLink.findUnique({ where: { token: `gbp_state_${state}` } });
  if (!stateRecord || stateRecord.expiresAt < new Date()) {
    return NextResponse.redirect(new URL('/portal?gbp=error&reason=state', request.url));
  }

  try {
    const tokens = await exchangeGbpCode(code);

    // Fetch the user's first GBP location to store.
    let locationId: string | null = null;
    let locationName: string | null = null;
    let accountId: string | null = null;
    try {
      const acctRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      if (acctRes.ok) {
        const acctData = await acctRes.json();
        const acct = acctData?.accounts?.[0];
        if (acct?.name) {
          accountId = acct.name;
          const locRes = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${acct.name}/locations?readMask=name,title`,
            { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
          );
          if (locRes.ok) {
            const locData = await locRes.json();
            const loc = locData?.locations?.[0];
            if (loc) { locationId = loc.name; locationName = loc.title; }
          }
        }
      }
    } catch { /* ignore — user can reconnect */ }

    await prisma.gbpConnection.upsert({
      where: { clientId: stateRecord.clientId },
      create: {
        clientId: stateRecord.clientId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
        accountId,
        locationId,
        locationName,
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
        accountId,
        locationId,
        locationName,
      },
    });

    // Cleanup state token.
    await prisma.clientMagicLink.delete({ where: { token: `gbp_state_${state}` } }).catch(() => {});

    return NextResponse.redirect(new URL('/portal?gbp=connected', request.url));
  } catch (e) {
    return NextResponse.redirect(new URL(`/portal?gbp=error&reason=${encodeURIComponent(String(e))}`, request.url));
  }
}
