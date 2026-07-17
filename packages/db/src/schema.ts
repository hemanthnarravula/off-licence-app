import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "owner",
  "manager",
  "staff",
  "customer",
]);

export const productCategoryEnum = pgEnum("product_category", [
  "beer",
  "wine",
  "spirits",
  "soft_drinks",
  "tobacco",
  "snacks",
  "other",
]);

export const stockRequestStatusEnum = pgEnum("stock_request_status", [
  "open",
  "done",
  "cancelled",
]);

export const productSuggestionStatusEnum = pgEnum("product_suggestion_status", [
  "open",
  "accepted",
  "dismissed",
]);

/* -------------------------------------------------------------------------- */
/* Better Auth core tables                                                     */
/* -------------------------------------------------------------------------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* -------------------------------------------------------------------------- */
/* Domain tables                                                               */
/* -------------------------------------------------------------------------- */

export const organisations = pgTable("organisation", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const stores = pgTable("store", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  openingHours: text("opening_hours"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const memberships = pgTable("membership", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  role: roleEnum("role").notNull(),
  /** Required for staff; null for owner/customer. Managers use membership_store. */
  storeId: uuid("store_id").references(() => stores.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const membershipStores = pgTable(
  "membership_store",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, { onDelete: "cascade" }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("membership_store_unique").on(
      table.membershipId,
      table.storeId,
    ),
  ],
);

export const sourcePlaces = pgTable("source_place", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const products = pgTable(
  "product",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "cascade" }),
    barcode: text("barcode").notNull(),
    name: text("name").notNull(),
    brand: text("brand"),
    category: productCategoryEnum("category").notNull(),
    sourcePlaceId: uuid("source_place_id").references(() => sourcePlaces.id, {
      onDelete: "set null",
    }),
    size: text("size"),
    abv: text("abv"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("product_org_barcode_unique").on(
      table.organisationId,
      table.barcode,
    ),
  ],
);

export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Null until first stock count or fulfil. */
    quantity: integer("quantity"),
    sellPricePence: integer("sell_price_pence"),
    reorderLevel: integer("reorder_level"),
  },
  (table) => [
    uniqueIndex("inventory_store_product_unique").on(
      table.storeId,
      table.productId,
    ),
  ],
);

export const stockCounts = pgTable("stock_count", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  countedByUserId: text("counted_by_user_id")
    .notNull()
    .references(() => user.id),
  quantityCounted: integer("quantity_counted").notNull(),
  previousQuantity: integer("previous_quantity"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const stockRequests = pgTable(
  "stock_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    requestedByUserId: text("requested_by_user_id")
      .notNull()
      .references(() => user.id),
    quantityRequested: integer("quantity_requested").notNull(),
    note: text("note"),
    status: stockRequestStatusEnum("status").default("open").notNull(),
    fulfilledByUserId: text("fulfilled_by_user_id").references(() => user.id),
    quantityBought: integer("quantity_bought"),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("stock_request_one_open_per_store_product")
      .on(table.storeId, table.productId)
      .where(sql`${table.status} = 'open'`),
  ],
);

export const productSuggestions = pgTable("product_suggestion", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  barcode: text("barcode").notNull(),
  suggestedByUserId: text("suggested_by_user_id")
    .notNull()
    .references(() => user.id),
  note: text("note"),
  status: productSuggestionStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const inviteStatusEnum = pgEnum("invite_status", [
  "open",
  "accepted",
  "revoked",
]);

export const invites = pgTable("invite", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisationId: uuid("organisation_id")
    .notNull()
    .references(() => organisations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: roleEnum("role").notNull(),
  storeId: uuid("store_id").references(() => stores.id, {
    onDelete: "set null",
  }),
  token: text("token").notNull().unique(),
  invitedByUserId: text("invited_by_user_id")
    .notNull()
    .references(() => user.id),
  status: inviteStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
