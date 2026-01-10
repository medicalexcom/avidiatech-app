import { z } from "zod";

export const matchJobSchema = z.object({
  items: z
    .array(
      z.object({
        sku: z.string().trim().min(1),
        brand: z.string().trim().optional(),
        gtin: z.string().trim().optional()
      })
    )
    .min(1)
    .max(parseInt(process.env.MATCH_MAX_BATCH || "1000"))
});

export const idListSchema = z.object({
  ids: z.array(z.string().uuid()).min(1)
});
