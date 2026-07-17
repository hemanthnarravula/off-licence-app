import { z } from "zod";

export const roleSchema = z.enum(["owner", "manager", "staff", "customer"]);
export type Role = z.infer<typeof roleSchema>;

export const productCategorySchema = z.enum([
  "beer",
  "wine",
  "spirits",
  "soft_drinks",
  "tobacco",
  "snacks",
  "other",
]);
export type ProductCategory = z.infer<typeof productCategorySchema>;

export const stockRequestStatusSchema = z.enum(["open", "done", "cancelled"]);
export type StockRequestStatus = z.infer<typeof stockRequestStatusSchema>;

export const productSuggestionStatusSchema = z.enum([
  "open",
  "accepted",
  "dismissed",
]);
export type ProductSuggestionStatus = z.infer<
  typeof productSuggestionStatusSchema
>;

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.literal("off-licence-api"),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const productInputSchema = z.object({
  barcode: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(120).optional().nullable(),
  category: productCategorySchema,
  sourcePlaceId: z.string().uuid().optional().nullable(),
  size: z.string().trim().max(80).optional().nullable(),
  abv: z.string().trim().max(40).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const productUpdateSchema = productInputSchema.partial();
export type ProductUpdate = z.infer<typeof productUpdateSchema>;

export const sourcePlaceInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().optional(),
});
export type SourcePlaceInput = z.infer<typeof sourcePlaceInputSchema>;

export const productImportSummarySchema = z.object({
  created: z.number().int(),
  updated: z.number().int(),
  skipped: z.number().int(),
  inventoryUpserts: z.number().int(),
  errors: z.array(
    z.object({
      row: z.number().int(),
      message: z.string(),
    }),
  ),
});
export type ProductImportSummary = z.infer<typeof productImportSummarySchema>;

export const stockRequestInputSchema = z.object({
  storeId: z.string().uuid(),
  productId: z.string().uuid(),
  quantityRequested: z.number().int().positive(),
  note: z.string().trim().max(500).optional().nullable(),
});
export type StockRequestInput = z.infer<typeof stockRequestInputSchema>;

export const fulfilStockRequestSchema = z.object({
  quantityBought: z.number().int().nonnegative(),
});
export type FulfilStockRequest = z.infer<typeof fulfilStockRequestSchema>;

export const productSuggestionInputSchema = z.object({
  storeId: z.string().uuid(),
  barcode: z.string().trim().min(1).max(64),
  note: z.string().trim().max(500).optional().nullable(),
});
export type ProductSuggestionInput = z.infer<
  typeof productSuggestionInputSchema
>;

export const storeInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(300).optional().nullable(),
  openingHours: z.string().trim().max(300).optional().nullable(),
});
export type StoreInput = z.infer<typeof storeInputSchema>;

export const teamInviteInputSchema = z.object({
  email: z.string().trim().email(),
  role: roleSchema,
  storeId: z.string().uuid().optional().nullable(),
  storeIds: z.array(z.string().uuid()).optional(),
});
export type TeamInviteInput = z.infer<typeof teamInviteInputSchema>;

export const inviteStatusSchema = z.enum(["open", "accepted", "revoked"]);
export type InviteStatus = z.infer<typeof inviteStatusSchema>;

export const stockCountInputSchema = z.object({
  storeId: z.string().uuid(),
  productId: z.string().uuid(),
  quantityCounted: z.number().int().nonnegative(),
  /** Required when server says the delta is large. */
  confirmLargeDelta: z.boolean().optional(),
});
export type StockCountInput = z.infer<typeof stockCountInputSchema>;
