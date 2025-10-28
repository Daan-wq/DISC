import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware is disabled for /quiz because:
// 1. Magic links need to go through /auth/callback first to set the session
// 2. The /quiz page itself handles auth checks client-side
// 3. Database RLS is the final security layer

export async function middleware(req: NextRequest) {
  // Currently no middleware needed - auth is handled by:
  // - Client-side redirect in /quiz page (useEffect)
  // - Database RLS policies (server-side enforcement)
  return NextResponse.next()
}

export const config = {
  matcher: []
}
