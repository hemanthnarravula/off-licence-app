import { randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import {
  invites,
  membershipStores,
  memberships,
  stores,
  user,
} from "@offlicence/db";
import { teamInviteInputSchema } from "@offlicence/shared";
import { requireRoles } from "@/lib/authz";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const { membership } = await requireRoles(["owner", "manager"]);

    const members = await db
      .select({
        id: memberships.id,
        role: memberships.role,
        storeId: memberships.storeId,
        userId: memberships.userId,
        email: user.email,
        name: user.name,
        createdAt: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(user, eq(memberships.userId, user.id))
      .where(eq(memberships.organisationId, membership.organisationId))
      .orderBy(asc(user.email));

    const openInvites = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.organisationId, membership.organisationId),
          eq(invites.status, "open"),
        ),
      )
      .orderBy(asc(invites.createdAt));

    return Response.json({ members, invites: openInvites });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, membership } = await requireRoles(["owner"]);
    const body = teamInviteInputSchema.parse(await request.json());

    if (body.role === "staff" && !body.storeId) {
      return Response.json(
        { error: "storeId is required for staff" },
        { status: 400 },
      );
    }

    if (body.storeId) {
      const [store] = await db
        .select()
        .from(stores)
        .where(
          and(
            eq(stores.id, body.storeId),
            eq(stores.organisationId, membership.organisationId),
          ),
        )
        .limit(1);
      if (!store) {
        return Response.json({ error: "Store not found" }, { status: 404 });
      }
    }

    const email = body.email.toLowerCase();
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser) {
      const [existingMembership] = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.userId, existingUser.id),
            eq(memberships.organisationId, membership.organisationId),
          ),
        )
        .limit(1);

      if (existingMembership) {
        return Response.json(
          { error: "User already has a membership" },
          { status: 409 },
        );
      }

      const [createdMembership] = await db
        .insert(memberships)
        .values({
          userId: existingUser.id,
          organisationId: membership.organisationId,
          role: body.role,
          storeId: body.role === "staff" ? body.storeId! : null,
        })
        .returning();

      if (body.role === "manager") {
        const storeIds = body.storeIds?.length
          ? body.storeIds
          : body.storeId
            ? [body.storeId]
            : [];
        for (const storeId of storeIds) {
          await db.insert(membershipStores).values({
            membershipId: createdMembership.id,
            storeId,
          });
        }
      }

      return Response.json(
        { membership: createdMembership, attachedExistingUser: true },
        { status: 201 },
      );
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
    const [invite] = await db
      .insert(invites)
      .values({
        organisationId: membership.organisationId,
        email,
        role: body.role,
        storeId: body.storeId ?? null,
        token,
        invitedByUserId: session.user.id,
        status: "open",
        expiresAt,
      })
      .returning();

    return Response.json(
      {
        invite,
        attachedExistingUser: false,
        message:
          "Invite created. User should sign up with this email, then re-run accept/seed, or use the token later.",
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
