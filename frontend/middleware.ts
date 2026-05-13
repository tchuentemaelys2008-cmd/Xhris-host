import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    if (pathname.startsWith('/admin')) {
      const role = token?.role as string;
      if (!['ADMIN', 'SUPERADMIN'].includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  // Middleware tourne UNIQUEMENT sur les routes protégées
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/developer/:path*',
    '/marketplace/:path*',
    '/community/:path*',
    '/request-coins/:path*',
  ],
};
