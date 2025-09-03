import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Public sayfalar (login erişimi olan)
  const publicPaths = ['/', '/login', '/login/2fa', '/order-info'];
  const pathname = request.nextUrl.pathname;
  const isPublicPath = publicPaths.includes(pathname);

  // Token kontrolü
  const token = request.cookies.get('access_token')?.value || '';

  // Eğer login sayfasındaysa ve token varsa dashboard'a yönlendir
  if (isPublicPath && token && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Eğer korumalı sayfadaysa ve token yoksa login'e yönlendir
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
