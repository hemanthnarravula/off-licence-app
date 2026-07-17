import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const allowedOrigins = new Set([
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:8090",
  "http://127.0.0.1:8090",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function withCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin") ?? "";
  if (allowedOrigins.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Cookie, X-Requested-With",
    );
  }
  return response;
}

export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return withCors(request, new NextResponse(null, { status: 204 }));
  }
  return withCors(request, NextResponse.next());
}

export const config = {
  matcher: "/api/:path*",
};
