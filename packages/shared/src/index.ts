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
