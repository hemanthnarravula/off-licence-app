import { config } from "dotenv";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  inventory,
  membership,
  organisation,
  product,
  store,
  user,
} from "./schema";

config({ path: resolve(process.cwd(), "../../.env") });
config();

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required");
}

const client = postgres(url, { max: 1 });
const db = drizzle(client);

async function seed() {
  const existing = await db.select().from(organisation).limit(1);
  if (existing.length > 0) {
    console.log("Seed skipped — organisation already exists");
    await client.end();
    return;
  }

  const [org] = await db
    .insert(organisation)
    .values({ name: "Narravula Off-Licence" })
    .returning();

  const [highStreet, stationRoad] = await db
    .insert(store)
    .values([
      {
        organisationId: org.id,
        name: "High Street",
        address: "12 High Street, London SW1A 1AA",
        openingHours: "Mon–Sat 8am–11pm, Sun 10am–10pm",
      },
      {
        organisationId: org.id,
        name: "Station Road",
        address: "4 Station Road, London NW1 2DB",
        openingHours: "Mon–Sun 7am–11pm",
      },
    ])
    .returning();

  const ownerId = "seed-owner";
  const staffHighId = "seed-staff-high";
  const staffStationId = "seed-staff-station";
  const customerId = "seed-customer";

  await db.insert(user).values([
    {
      id: ownerId,
      name: "Owner Alex",
      email: "owner@example.com",
      emailVerified: true,
    },
    {
      id: staffHighId,
      name: "Staff Sam",
      email: "staff.high@example.com",
      emailVerified: true,
    },
    {
      id: staffStationId,
      name: "Staff Jordan",
      email: "staff.station@example.com",
      emailVerified: true,
    },
    {
      id: customerId,
      name: "Customer Casey",
      email: "customer@example.com",
      emailVerified: true,
    },
  ]);

  await db.insert(membership).values([
    {
      userId: ownerId,
      organisationId: org.id,
      role: "owner",
      storeId: null,
    },
    {
      userId: staffHighId,
      organisationId: org.id,
      role: "staff",
      storeId: highStreet.id,
    },
    {
      userId: staffStationId,
      organisationId: org.id,
      role: "staff",
      storeId: stationRoad.id,
    },
    {
      userId: customerId,
      organisationId: org.id,
      role: "customer",
      storeId: null,
    },
  ]);

  const products = await db
    .insert(product)
    .values([
      {
        organisationId: org.id,
        barcode: "5012345678900",
        name: "Stella Artois 4-pack",
        brand: "Stella Artois",
        category: "beer",
        sourcePlace: "Booker",
        size: "4x440ml",
        abv: "4.6%",
      },
      {
        organisationId: org.id,
        barcode: "5012345678901",
        name: "Hardys Shiraz",
        brand: "Hardys",
        category: "wine",
        sourcePlace: "Bestway",
        size: "75cl",
        abv: "13.5%",
      },
      {
        organisationId: org.id,
        barcode: "5012345678902",
        name: "Smirnoff Red",
        brand: "Smirnoff",
        category: "spirits",
        sourcePlace: "Booker",
        size: "70cl",
        abv: "37.5%",
      },
      {
        organisationId: org.id,
        barcode: "5012345678903",
        name: "Coca-Cola 2L",
        brand: "Coca-Cola",
        category: "soft_drinks",
        sourcePlace: "Bestway",
        size: "2L",
      },
      {
        organisationId: org.id,
        barcode: "5012345678904",
        name: "Walkers Ready Salted",
        brand: "Walkers",
        category: "snacks",
        sourcePlace: "Local cash & carry",
        size: "32.5g",
      },
    ])
    .returning();

  const inventoryRows = products.flatMap((p) => [
    {
      storeId: highStreet.id,
      productId: p.id,
      quantity: 12,
      sellPricePence: 599,
      reorderLevel: 4,
    },
    {
      storeId: stationRoad.id,
      productId: p.id,
      quantity: 8,
      sellPricePence: 649,
      reorderLevel: 3,
    },
  ]);
  await db.insert(inventory).values(inventoryRows);

  console.log("Seed complete");
  console.log(`Org: ${org.name}`);
  console.log(`Stores: ${highStreet.name} + ${stationRoad.name}`);
  console.log(`Products: ${products.length}`);
  console.log("Create auth users via POST /api/auth/sign-up/email");
  await client.end();
}

await seed();
