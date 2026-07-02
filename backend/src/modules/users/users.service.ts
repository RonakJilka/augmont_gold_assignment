import bcrypt from "bcrypt";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { HttpError } from "../../utils/httpError";

const publicSelect = { id: true, email: true, createdAt: true, updatedAt: true } as const;

export const list = async () => {
  return prisma.user.findMany({ select: publicSelect, orderBy: { id: "desc" } });
};

export const getById = async (id: bigint) => {
  const user = await prisma.user.findUnique({ where: { id }, select: publicSelect });
  if (!user) throw new HttpError(404, "NOT_FOUND", "User not found");
  return user;
};

export const create = async (email: string, password: string) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, "CONFLICT", "Email already registered");
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  return prisma.user.create({ data: { email, passwordHash }, select: publicSelect });
};

export const update = async (
  id: bigint,
  data: { email?: string; password?: string }
) => {
  const patch: { email?: string; passwordHash?: string } = {};
  if (data.email) patch.email = data.email;
  if (data.password) patch.passwordHash = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);
  return prisma.user.update({ where: { id }, data: patch, select: publicSelect });
};

export const remove = async (id: bigint) => {
  await prisma.user.delete({ where: { id } });
};
