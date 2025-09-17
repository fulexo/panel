import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/api/auth/login',
  '/api/auth/set-tokens',
  '/api/auth/clear-tokens',
  '/api/health',
  '/api/errors',
];

// API routes that don't require authentication
const publicApiRoutes = [
  '/api/auth/login',
  '/api/auth/set-tokens',
  '/api/auth/clear-tokens',
  '/api/health',
  '/api/errors',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }
  
  // Allow public API routes
  if (pathname.startsWith('/api/') && publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Check for authentication cookie
  const accessToken = request.cookies.get('access_token');
  
  // If no access token, redirect to login
  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // If authenticated, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};