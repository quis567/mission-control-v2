import prisma from '@/lib/db';

export async function getPortalClientId(request: Request): Promise<string | null> {
  const token = request.headers.get('x-portal-token');
  if (!token) return null;

  const session = await prisma.clientPortalSession.findUnique({
    where: { token },
    select: { clientId: true, expiresAt: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session.clientId;
}
