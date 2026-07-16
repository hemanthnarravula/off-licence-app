import {
  memberships,
  organisations,
  sourcePlaces,
  stores,
  user,
} from "@offlicence/db/schema";
import { createDb } from "@offlicence/db";
import { eq } from "drizzle-orm";

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

  const users = await db.select().from(user).limit(5);
  if (!users.length) {
    console.log(
      "No users yet — sign up via /login, then re-run seed to attach owner membership.",
    );
    return;
  }

  for (const candidate of users) {
    const existing = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, candidate.id))
      .limit(1);

    if (existing.length) continue;

    await db.insert(memberships).values({
      userId: candidate.id,
      organisationId: org.id,
      role: "owner",
      storeId: null,
    });
    console.log(`Attached ${candidate.email} as owner`);
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
