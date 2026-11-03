import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * MealPass Edge Route Guard Middleware
 * Intercepts unauthenticated direct browser navigation to protected role spaces.
 * Strictly verifies session presence, expiry, and role clearance before rendering client shells.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isStudentRoute = pathname.startsWith('/student');
  const isCafeteriaRoute = pathname.startsWith('/cafeteria');
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/bursary');

  if (!isStudentRoute && !isCafeteriaRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('mealpass_session')?.value;
  if (!sessionCookie) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    let payloadJson: string | null = null;
    if (sessionCookie.includes('.')) {
      const parts = sessionCookie.split('.');
      payloadJson = atob(parts[0]);
    } else {
      payloadJson = atob(sessionCookie);
    }

    if (!payloadJson) {
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = JSON.parse(payloadJson);
    if (!payload || !payload.role) {
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Expiration check
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('mealpass_session');
      return response;
    }

    // Role-based boundary enforcement
    if (isStudentRoute) {
      const allowedRoles = ['STUDENT', 'SUPER_ADMIN', 'FINANCE_ADMIN'];
      if (!allowedRoles.includes(payload.role)) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    if (isCafeteriaRoute) {
      const allowedRoles = ['CAFETERIA_HEAD', 'CAFETERIA_STAFF', 'SUPER_ADMIN'];
      if (!allowedRoles.includes(payload.role)) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    if (isAdminRoute) {
      const allowedRoles = ['SUPER_ADMIN', 'FINANCE_ADMIN'];
      if (!allowedRoles.includes(payload.role)) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/student/:path*',
    '/cafeteria/:path*',
    '/admin/:path*',
    '/bursary/:path*',
  ],
};
