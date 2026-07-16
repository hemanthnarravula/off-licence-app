import { AuthzError } from "@/lib/authz";
import { ZodError } from "zod";

export function jsonError(error: unknown) {
  if (error instanceof AuthzError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return Response.json(
      { error: "Validation failed", issues: error.issues },
      { status: 400 },
    );
  }
  console.error(error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
