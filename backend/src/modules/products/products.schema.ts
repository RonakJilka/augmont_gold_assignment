import { z } from "zod";

export const createSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.coerce.number().min(0),
  categoryUniqueId: z.string().regex(/^CAT-[A-Z0-9]{6}$/),
});

export const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  price: z.coerce.number().min(0).optional(),
  categoryUniqueId: z.string().regex(/^CAT-[A-Z0-9]{6}$/).optional(),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["price:asc", "price:desc"]).optional(),
  search: z.string().trim().min(1).optional(),
  categoryUniqueId: z.string().regex(/^CAT-[A-Z0-9]{6}$/).optional(),
});

export const uniqueIdParam = z.object({
  uniqueId: z.string().regex(/^PRD-[A-Z0-9]{6}$/),
});

export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
