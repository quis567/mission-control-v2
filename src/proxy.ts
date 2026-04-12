import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: { signIn: '/login' },
});

export const config = {
  matcher: ['/((?!login|api/auth|api/request|api/portal|api/leads|api/audit|portal|request|api/clients/generate-slugs|_next/static|_next/image|favicon.ico|images/|sounds/).*)'],
};

