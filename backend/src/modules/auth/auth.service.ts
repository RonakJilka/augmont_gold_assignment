import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { HttpError } from "../../utils/httpError";

interface UserLike {
  id: bigint;
  email: string;
}

export const signToken = (user: UserLike): string => {
  return jwt.sign(
    { sub: user.id.toString(), email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as SignOptions
  );
};

export const register = async (email: string, password: string) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, "CONFLICT", "Email already registered");
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true, createdAt: true },
  });
  const token = signToken({ id: user.id, email: user.email });
  return { user, token };
};

export const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new HttpError(401, "UNAUTHORIZED", "Invalid credentials");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new HttpError(401, "UNAUTHORIZED", "Invalid credentials");
  const token = signToken({ id: user.id, email: user.email });
  return { user: { id: user.id, email: user.email, createdAt: user.createdAt }, token };
};
