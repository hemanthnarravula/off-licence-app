import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/cors";

export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return preflight(request);
  }

  const response = NextResponse.next();
  const headers = corsHeaders(request.headers.get("origin"));
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
