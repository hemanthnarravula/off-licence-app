import { z } from "zod";

export const roles = ["owner", "manager", "staff", "customer"] as const;
export const RoleSchema = z.enum(roles);
export type Role = z.infer<typeof RoleSchema>;

export const categories = [
  "beer",
  "wine",
  "spirits",
  "soft_drinks",
  "tobacco",
  "snacks",
  "other",
] as const;
export const CategorySchema = z.enum(categories);
export type Category = z.infer<typeof CategorySchema>;

export const stockRequestStatuses = ["open", "done", "cancelled"] as const;
export const StockRequestStatusSchema = z.enum(stockRequestStatuses);
export type StockRequestStatus = z.infer<typeof StockRequestStatusSchema>;

export const CreateStockCountSchema = z.object({
  productId: z.string().uuid(),
  quantityCounted: z.number().int().min(0),
});

export const CreateStockRequestSchema = z.object({
  productId: z.string().uuid(),
  quantityRequested: z.number().int().positive(),
  note: z.string().max(500).optional(),
});

export const FulfilStockRequestSchema = z.object({
  quantityBought: z.number().int().positive(),
});
