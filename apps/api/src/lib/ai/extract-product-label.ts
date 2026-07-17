import { gateway, generateObject } from "ai";
import { z } from "zod";
import { categories } from "@off-licence/shared";

export const ProductLabelSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      "Retail product name from the packaging (e.g. 'Stella Artois 4-pack'), not marketing slogans",
    ),
  brand: z
    .string()
    .nullable()
    .describe("Brand or manufacturer if visible (e.g. 'Stella Artois'), else null"),
  category: z
    .enum(categories)
    .describe(
      `One of: ${categories.join(", ")}. Pick the best off-licence shelf category for this product.`,
    ),
});

export type ProductLabelExtraction = z.infer<typeof ProductLabelSchema>;

/** Free-tier friendly vision models on Vercel AI Gateway */
const FREE_TIER_VISION_MODELS = [
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-flash",
  "openai/gpt-4o-mini",
  "amazon/nova-lite",
] as const;

const DEFAULT_MODEL = FREE_TIER_VISION_MODELS[0];

export function hasAiSdkAuth() {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
  );
}

type ExtractProductLabelInput = {
  image: Buffer;
  mediaType: string;
};

/**
 * Uses the Vercel AI SDK + AI Gateway to read name, brand, and category
 * from a product label photo.
 */
export async function extractProductLabelFromImage({
  image,
  mediaType,
}: ExtractProductLabelInput): Promise<ProductLabelExtraction> {
  const primary = process.env.AI_GATEWAY_MODEL?.trim() || DEFAULT_MODEL;

  const { object } = await generateObject({
    model: gateway(primary),
    schema: ProductLabelSchema,
    providerOptions: {
      gateway: {
        models: [...FREE_TIER_VISION_MODELS],
        tags: ["feature:product-label-extract", "tier:free"],
      },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Extract catalogue fields from this UK off-licence product photo.",
              "Return exactly:",
              "1) name — concise retail product name",
              "2) brand — manufacturer/brand, or null if unclear",
              `3) category — must be one of: ${categories.join(", ")}`,
              "Use the packaging text and product type to choose category",
              "(beer, wine, spirits, soft_drinks, tobacco, snacks, or other).",
              "Do not invent details that are not visible.",
            ].join(" "),
          },
          {
            type: "image",
            image,
            mediaType,
          },
        ],
      },
    ],
  });

  return object;
}
