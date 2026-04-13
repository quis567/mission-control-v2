import { withAuth } from 'next-auth/middleware';

const PUBLIC_PREFIXES = [
  '/login',
  '/api/auth',
  '/api/request',
  '/api/portal',
  '/api/leads',
  '/api/audit',
  '/api/clients/generate-slugs',
  '/portal',
  '/request',
];

export default withAuth({
  pages: { signIn: '/login' },
  callbacks: {
    authorized({ req, token }) {
      const path = req.nextUrl.pathname;

      // Allow public paths without auth
      for (const prefix of PUBLIC_PREFIXES) {
        if (path.startsWith(prefix)) return true;
      }

      // Everything else requires a valid session
      return !!token;
    },
  },
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/|sounds/).*)'],
};
