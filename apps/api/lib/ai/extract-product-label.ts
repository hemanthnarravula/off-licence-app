import { gateway } from "@ai-sdk/gateway";
import { generateObject } from "ai";
import { z } from "zod";
import { productCategorySchema } from "@offlicence/shared";

const extractedProductSchema = z.object({
  name: z
    .string()
    .nullable()
    .describe("Product name from the label, without brand if brand is separate"),
  brand: z.string().nullable().describe("Brand or manufacturer name from the label"),
  category: productCategorySchema
    .nullable()
    .describe(
      "Best-fit category: beer, wine, spirits, soft_drinks, tobacco, snacks, or other",
    ),
  size: z
    .string()
    .nullable()
    .describe(
      "Pack size or volume as printed, e.g. 330ml, 75cl, 12x330ml, 20 pack, 1L",
    ),
});

export type ExtractedProductFields = z.infer<typeof extractedProductSchema>;

function getModelId() {
  return process.env.AI_GATEWAY_MODEL?.trim() || "google/gemini-2.5-flash-lite";
}

export function isAiExtractionConfigured() {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.VERCEL_OIDC_TOKEN?.trim() ||
      process.env.VERCEL === "1",
  );
}

export async function extractProductFieldsFromImage(
  image: Uint8Array | ArrayBuffer,
  mediaType: string,
): Promise<ExtractedProductFields> {
  const bytes = image instanceof Uint8Array ? image : new Uint8Array(image);

  const { object } = await generateObject({
    model: gateway(getModelId()),
    schema: extractedProductSchema,
    schemaName: "product_label",
    schemaDescription: "Product details read from a retail label photo",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "You are reading a product label photo for a UK off-licence inventory app.",
              "Extract name, brand, category, and size/pack (item quality/volume).",
              "Use only what is visible on the label. If a field is unclear, return null.",
              "Prefer short retail product names. Category must be one of the allowed enum values.",
            ].join(" "),
          },
          {
            type: "image",
            image: bytes,
            mediaType,
          },
        ],
      },
    ],
  });

  return object;
}
