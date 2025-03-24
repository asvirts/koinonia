import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware() {
  // Get the response
  const response = NextResponse.next()

  // Add security headers
  const headers = response.headers

  // Set strict Content Security Policy
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; media-src 'self'; frame-src 'none'; frame-ancestors 'none'; form-action 'self';"
  )

  // Prevent MIME type sniffing
  headers.set("X-Content-Type-Options", "nosniff")

  // XSS Protection
  headers.set("X-XSS-Protection", "1; mode=block")

  // Set strict transport security to force HTTPS
  headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  )

  // Prevent embedding the site in an iframe
  headers.set("X-Frame-Options", "DENY")

  // Referrer policy to control how much info is sent
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // Permissions policy to limit features
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  )

  return response
}

// Only apply this middleware to pages in the application
export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)"
}
