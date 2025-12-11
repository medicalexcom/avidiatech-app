import { z } from "zod";

export const postSeoUrlOnlySchema = z.object({
  url: z.string().url().min(10)
});
