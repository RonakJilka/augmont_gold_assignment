import { z } from "zod";

export const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const updateSchema = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
  })
  .refine((v) => v.email !== undefined || v.password !== undefined, {
    message: "At least one field is required",
  });

export const idParam = z.object({ id: z.string().regex(/^\d+$/) });
