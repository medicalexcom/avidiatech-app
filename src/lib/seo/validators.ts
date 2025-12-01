// src/lib/seo/validators.ts
import { z } from "zod";

export const postSeoUrlOnlySchema = z.object({
  url: z.string().url().min(10),
});

export const postSeoBodySchema = z.object({
  ingestionId: z.string().min(10),
  options: z
    .object({
      regenerate: z.boolean().optional(),
      respectExistingDescribe: z.boolean().optional(),
      includeManualsSection: z.boolean().optional(),
      includeSpecsSection: z.boolean().optional(),
      strictMode: z.boolean().optional(),
    })
    .optional(),
});
