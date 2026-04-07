import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * Validates an API key from the x-api-key header.
 * Returns the ApiKey record if valid, or a NextResponse error if not.
 */
export async function validateApiKey(req: NextRequest): Promise<
  | { valid: true; keyId: string }
  | { valid: false; response: NextResponse }
> {
  const apiKey = req.headers.get('x-api-key');

  if (!apiKey) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Missing x-api-key header' },
        { status: 401 }
      ),
    };
  }

  const record = await prisma.apiKey.findFirst({
    where: { key: apiKey, active: true },
  });

  if (!record) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Invalid or inactive API key' },
        { status: 401 }
      ),
    };
  }

  // Update last used timestamp (fire and forget)
  prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return { valid: true, keyId: record.id };
}
