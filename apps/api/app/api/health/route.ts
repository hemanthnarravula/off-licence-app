import { healthResponseSchema } from "@offlicence/shared";

export function GET() {
  const body = healthResponseSchema.parse({
    ok: true as const,
    service: "off-licence-api" as const,
  });

  return Response.json(body);
}
