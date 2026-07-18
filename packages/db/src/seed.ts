import {
  account,
  memberships,
  organisations,
  productSuggestions,
  products,
  sourcePlaces,
  stockRequests,
  stores,
  user,
} from "@offlicence/db/schema";
import { createDb } from "@offlicence/db";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";

const DEMO_EMAIL = "owner@example.com";
const DEMO_PASSWORD = "password123";

function newId() {
  return randomBytes(24).toString("base64url");
}

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);

  let org = (await db.select().from(organisations).limit(1))[0];

  if (!org) {
    [org] = await db
      .insert(organisations)
      .values({ name: "Demo Off-licence" })
      .returning();

    const [storeA, storeB] = await db
      .insert(stores)
      .values([
        {
          organisationId: org.id,
          name: "High Street",
          address: "1 High Street",
        },
        {
          organisationId: org.id,
          name: "Station Road",
          address: "22 Station Road",
        },
      ])
      .returning();

    await db.insert(sourcePlaces).values([
      { organisationId: org.id, name: "Booker", sortOrder: 1 },
      { organisationId: org.id, name: "Bestway", sortOrder: 2 },
    ]);

    console.log("Seeded org", org.id, "stores", storeA.id, storeB.id);
  } else {
    console.log("Organisation already exists:", org.id);
  }

  let users = await db.select().from(user).limit(5);
  if (!users.length) {
    const userId = newId();
    const now = new Date();
    await db.insert(user).values({
      id: userId,
      name: "Demo Owner",
      email: DEMO_EMAIL,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(account).values({
      id: newId(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: await hashPassword(DEMO_PASSWORD),
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created demo user ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    users = await db.select().from(user).limit(5);
  }

  let ownerUserId: string | null = null;

  for (const candidate of users) {
    const existing = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, candidate.id))
      .limit(1);

    if (existing.length) {
      ownerUserId ??= candidate.id;
      continue;
    }

    await db.insert(memberships).values({
      userId: candidate.id,
      organisationId: org.id,
      role: "owner",
      storeId: null,
    });
    ownerUserId ??= candidate.id;
    console.log(`Attached ${candidate.email} as owner`);
  }

  const orgStores = await db
    .select()
    .from(stores)
    .where(eq(stores.organisationId, org.id));
  const orgProducts = await db
    .select()
    .from(products)
    .where(eq(products.organisationId, org.id))
    .limit(5);

  if (ownerUserId && orgStores[0] && orgProducts.length) {
    for (const product of orgProducts.slice(0, 2)) {
      const [open] = await db
        .select()
        .from(stockRequests)
        .where(
          and(
            eq(stockRequests.storeId, orgStores[0].id),
            eq(stockRequests.productId, product.id),
            eq(stockRequests.status, "open"),
          ),
        )
        .limit(1);
      if (open) continue;
      await db.insert(stockRequests).values({
        storeId: orgStores[0].id,
        productId: product.id,
        requestedByUserId: ownerUserId,
        quantityRequested: 6,
        note: "Seed request",
        status: "open",
      });
    }
    console.log("Ensured sample open stock requests");

    const [existingSuggestion] = await db
      .select()
      .from(productSuggestions)
      .where(
        and(
          eq(productSuggestions.organisationId, org.id),
          eq(productSuggestions.status, "open"),
        ),
      )
      .limit(1);
    if (!existingSuggestion) {
      await db.insert(productSuggestions).values({
        organisationId: org.id,
        storeId: orgStores[0].id,
        barcode: "0000000000000",
        note: "Seed unknown barcode",
        suggestedByUserId: ownerUserId,
        status: "open",
      });
      console.log("Seeded sample product suggestion");
    }
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
