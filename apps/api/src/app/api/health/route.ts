import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { corsHeaders, preflight } from "@/lib/cors";
import { db } from "@/lib/db";

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json(
      {
        ok: true,
        service: "off-licence-api",
        database: "connected",
      },
      { headers: corsHeaders(origin) },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "off-licence-api",
        database: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders(origin) },
    );
  }
}
