import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const country = req.geo?.country || ''
  const language = country === 'KR' ? 'ko' : 'en'
  const response = NextResponse.next()
  response.cookies.set('language', language, { path: '/' })
  return response
}

export const config = {
  matcher: '/:path*',
}
