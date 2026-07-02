import { z } from "zod";

export const createSchema = z.object({
  name: z.string().min(1).max(120),
});

export const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
});

export const listQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uniqueIdParam = z.object({
  uniqueId: z.string().regex(/^CAT-[A-Z0-9]{6}$/),
});
