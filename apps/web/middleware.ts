import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get user from cookies
  const userCookie = request.cookies.get('user');
  const accessToken = request.cookies.get('access_token');
  
  if (process.env['NODE_ENV'] === 'development') {
    // Minimal debug without leaking sensitive values
     
    console.log('Middleware', {
      pathname,
      hasUserCookie: Boolean(userCookie?.value),
      hasAccessToken: Boolean(accessToken?.value),
    });
  }
  
  let user = null;
  try {
    if (userCookie?.value) {
      user = JSON.parse(userCookie.value);
      if (process.env['NODE_ENV'] === 'development') {
         
        console.log('Middleware - parsed user');
      }
    }
  } catch {
    if (process.env['NODE_ENV'] === 'development') {
       
      console.log('Middleware - cookie parse error');
    }
    // Invalid user cookie, clear it
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/order-info', // Public order info page
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/me', // Allow auth check without authentication
    '/api/errors',
    '/api/auth/clear-tokens',
    '/api/auth/set-tokens',
    '/_next',
    '/favicon.ico',
    '/manifest.json',
  ];

  // Check if the current path is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route) || pathname === '/'
  );

  // API routes that require authentication
  const protectedApiRoutes = [
    '/api/auth/logout',
    '/api/auth/2fa',
  ];

  const isProtectedApiRoute = protectedApiRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Redirect unauthenticated users to login
  if (!isPublicRoute && !user && !accessToken) {
    if (process.env['NODE_ENV'] === 'development') {
       
      console.log('Middleware - Redirecting to login');
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if ((user || accessToken) && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Handle protected API routes
  if (isProtectedApiRoute && !accessToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Add security headers
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Add CSRF protection for state-changing requests
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const referer = request.headers.get('referer');
    
    // Enhanced CSRF protection
    if (origin && host && !origin.includes(host)) {
      console.warn(`CSRF: Origin mismatch - Origin: ${origin}, Host: ${host}`);
      return NextResponse.json(
        { error: 'CSRF protection: Origin mismatch' },
        { status: 403 }
      );
    }
    
    // Additional referer check
    if (referer && host && !referer.includes(host)) {
      console.warn(`CSRF: Referer mismatch - Referer: ${referer}, Host: ${host}`);
      return NextResponse.json(
        { error: 'CSRF protection: Referer mismatch' },
        { status: 403 }
      );
    }
    
    // Check for suspicious patterns (relaxed for development)
    const userAgent = request.headers.get('user-agent') || '';
    if (userAgent.length < 5 || /bot|crawler|spider|scraper|curl|wget/i.test(userAgent)) {
      // Allow but log suspicious activity (relaxed for development)
      if (process.env.NODE_ENV !== 'development') {
        console.warn(`Suspicious user agent detected: ${userAgent}`);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};