import { AuthzError, requireMembership } from "@/lib/authz";

export async function GET() {
  try {
    const { session, membership } = await requireMembership();
    return Response.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      membership: {
        id: membership.membershipId,
        organisationId: membership.organisationId,
        role: membership.role,
        storeIds: membership.storeIds,
      },
    });
  } catch (error) {
    if (error instanceof AuthzError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
