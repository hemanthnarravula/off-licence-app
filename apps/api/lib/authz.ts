import { and, eq } from "drizzle-orm";
import {
  membershipStores,
  memberships,
  stores,
  type Db,
} from "@offlicence/db";
import type { Role } from "@offlicence/shared";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export class AuthzError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthzError";
    this.status = status;
  }
}

export type MembershipContext = {
  userId: string;
  membershipId: string;
  organisationId: string;
  role: Role;
  /** Staff: single store. Manager: assigned stores. Owner/customer: all org stores (null means unrestricted within org). */
  storeIds: string[] | null;
};

export async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new AuthzError("Unauthorized", 401);
  }

  return session;
}

export async function getMembershipForUser(
  userId: string,
  organisationId?: string,
  database: Db = db,
): Promise<MembershipContext | null> {
  const rows = await database
    .select()
    .from(memberships)
    .where(
      organisationId
        ? and(
            eq(memberships.userId, userId),
            eq(memberships.organisationId, organisationId),
          )
        : eq(memberships.userId, userId),
    )
    .limit(1);

  const membership = rows[0];
  if (!membership) return null;

  if (membership.role === "staff") {
    if (!membership.storeId) {
      throw new AuthzError("Staff membership is missing storeId", 500);
    }
    return {
      userId,
      membershipId: membership.id,
      organisationId: membership.organisationId,
      role: membership.role,
      storeIds: [membership.storeId],
    };
  }

  if (membership.role === "manager") {
    const assigned = await database
      .select({ storeId: membershipStores.storeId })
      .from(membershipStores)
      .where(eq(membershipStores.membershipId, membership.id));

    return {
      userId,
      membershipId: membership.id,
      organisationId: membership.organisationId,
      role: membership.role,
      storeIds: assigned.map((row) => row.storeId),
    };
  }

  // owner / customer — organisation-wide (no store restriction list)
  return {
    userId,
    membershipId: membership.id,
    organisationId: membership.organisationId,
    role: membership.role,
    storeIds: null,
  };
}

export async function requireMembership(organisationId?: string) {
  const session = await requireSession();
  const membership = await getMembershipForUser(
    session.user.id,
    organisationId,
  );

  if (!membership) {
    throw new AuthzError("No organisation membership", 403);
  }

  return { session, membership };
}

export async function requireRoles(
  allowed: Role[],
  organisationId?: string,
) {
  const ctx = await requireMembership(organisationId);
  if (!allowed.includes(ctx.membership.role)) {
    throw new AuthzError("Forbidden for this role", 403);
  }
  return ctx;
}

export function assertStoreAccess(
  membership: MembershipContext,
  storeId: string,
) {
  if (membership.storeIds === null) return;
  if (!membership.storeIds.includes(storeId)) {
    throw new AuthzError("Store not in membership scope", 403);
  }
}

export async function scopedStoreIds(
  membership: MembershipContext,
  database: Db = db,
) {
  if (membership.storeIds !== null) return membership.storeIds;

  const rows = await database
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.organisationId, membership.organisationId));

  return rows.map((row) => row.id);
}

export function filterStoreIdList(
  membership: MembershipContext,
  requested?: string[],
) {
  if (membership.storeIds === null) {
    return requested ?? null;
  }

  if (!requested?.length) return membership.storeIds;

  const allowed = requested.filter((id) => membership.storeIds!.includes(id));
  if (!allowed.length) {
    throw new AuthzError("No accessible stores in request", 403);
  }
  return allowed;
}
