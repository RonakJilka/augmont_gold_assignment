import { z } from "zod";

export const createReportSchema = z.object({
  format: z.enum(["csv", "xlsx"]).default("xlsx"),
  search: z.string().trim().min(1).optional(),
  categoryUniqueId: z.string().regex(/^CAT-[A-Z0-9]{6}$/).optional(),
  sort: z.enum(["price:asc", "price:desc"]).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
