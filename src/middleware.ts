import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Match /base/:id or /base/:id/:tableId or /base/:id/:tableId/:viewId
  const baseMatch = pathname.match(/^\/base\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?\/?$/);

  if (baseMatch) {
    const [, baseId, tableId, viewId] = baseMatch;

    // ✅ Allow exact /base/:id through — no redirect
    if (!tableId && !viewId) {
      return response;
    }

    // ❌ If only one param is missing, redirect to /base/:id
    if (!tableId || !viewId) {
      url.pathname = `/base/${baseId}`;
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
