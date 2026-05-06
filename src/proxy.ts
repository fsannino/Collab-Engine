import { type NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = process.env.COOKIE_NAME ?? 'collab_session';

// Paths the proxy never intercepts
const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/api/health',
  '/api/cron',       // protected by CRON_SECRET bearer token
  '/api/webhooks',   // protected by HMAC signature
  '/_next',
  '/favicon.ico',
];

// Paths that require ADMIN role
const ADMIN_PATHS = ['/admin'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);

    // RBAC: admin-only paths
    if (ADMIN_PATHS.some((p) => pathname.startsWith(p)) && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
