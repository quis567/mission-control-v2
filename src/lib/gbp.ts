// Google Business Profile helper — OAuth + data fetching.
//
// Google API scopes needed: https://www.googleapis.com/auth/business.manage
// Docs: https://developers.google.com/my-business/reference/rest
//
// Note: Google Business Profile APIs require allowlist approval from Google.
// Until approved, we fall back to Places API (using gbpPlaceId on the client) for
// rating + review count, which does NOT require OAuth.

import prisma from '@/lib/db';

const GOOGLE_OAUTH_REDIRECT_PATH = '/api/portal/gbp/callback';

export function getGbpOAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';
  if (!clientId || !baseUrl) throw new Error('GOOGLE_OAUTH_CLIENT_ID or APP_URL not configured');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${baseUrl}${GOOGLE_OAUTH_REDIRECT_PATH}`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/business.manage',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGbpCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${baseUrl}${GOOGLE_OAUTH_REDIRECT_PATH}`,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + (data.expires_in - 60) * 1000),
    scope: data.scope || '',
  };
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in - 60) * 1000),
  };
}

async function getValidAccessToken(clientId: string): Promise<string | null> {
  const conn = await prisma.gbpConnection.findUnique({ where: { clientId } });
  if (!conn) return null;
  if (conn.expiresAt > new Date()) return conn.accessToken;
  try {
    const refreshed = await refreshAccessToken(conn.refreshToken);
    await prisma.gbpConnection.update({
      where: { clientId },
      data: { accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt },
    });
    return refreshed.accessToken;
  } catch {
    return null;
  }
}

export interface GbpSnapshotData {
  rating: number | null;
  reviewCount: number | null;
  newReviewsMonth: number | null;
  recentReviews: Array<{ author: string; rating: number; text: string; createdAt: string }>;
  raw: unknown;
}

// Fetch via Places API v1 (New) — only needs an API key + place ID.
async function fetchPlacesData(placeId: string): Promise<GbpSnapshotData | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'rating,userRatingCount,reviews',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const reviews = Array.isArray(data.reviews) ? data.reviews : [];
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = reviews.slice(0, 5).map((r: Record<string, unknown>) => {
      const authorObj = r.authorAttribution as { displayName?: string } | undefined;
      const textObj = r.text as { text?: string } | undefined;
      const publishTime = r.publishTime as string | undefined;
      return {
        author: authorObj?.displayName || 'Anonymous',
        rating: (r.rating as number) || 0,
        text: textObj?.text || '',
        createdAt: publishTime || '',
      };
    });
    const newReviewsMonth = reviews.filter((r: Record<string, unknown>) => {
      const pt = r.publishTime as string | undefined;
      return pt && new Date(pt).getTime() > monthAgo;
    }).length;
    return {
      rating: data.rating ?? null,
      reviewCount: data.userRatingCount ?? null,
      newReviewsMonth,
      recentReviews: recent,
      raw: data,
    };
  } catch {
    return null;
  }
}

// Try GBP API (OAuth) first, fall back to Places API.
export async function fetchGbpSnapshot(clientId: string): Promise<GbpSnapshotData | null> {
  const token = await getValidAccessToken(clientId);
  const conn = await prisma.gbpConnection.findUnique({ where: { clientId } });

  if (token && conn?.locationId) {
    try {
      // Fetch recent reviews via the GBP API.
      const res = await fetch(
        `https://mybusiness.googleapis.com/v4/${conn.locationId}/reviews?pageSize=5`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        const reviews = Array.isArray(data.reviews) ? data.reviews : [];
        const avgRating = data.averageRating ?? null;
        const total = data.totalReviewCount ?? null;
        const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const ratingMap: Record<string, number> = { FIVE: 5, FOUR: 4, THREE: 3, TWO: 2, ONE: 1 };
        return {
          rating: avgRating,
          reviewCount: total,
          newReviewsMonth: reviews.filter((r: Record<string, unknown>) => {
            const ct = r.createTime as string | undefined;
            return ct && new Date(ct).getTime() > monthAgo;
          }).length,
          recentReviews: reviews.slice(0, 5).map((r: Record<string, unknown>) => {
            const reviewer = r.reviewer as { displayName?: string } | undefined;
            return {
              author: reviewer?.displayName || 'Anonymous',
              rating: ratingMap[r.starRating as string] || 0,
              text: (r.comment as string) || '',
              createdAt: (r.createTime as string) || '',
            };
          }),
          raw: data,
        };
      }
    } catch {
      /* fall through to Places */
    }
  }

  // Fallback: Places API via gbpPlaceId.
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { gbpPlaceId: true } });
  if (client?.gbpPlaceId) return fetchPlacesData(client.gbpPlaceId);
  return null;
}
