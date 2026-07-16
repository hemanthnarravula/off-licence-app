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
