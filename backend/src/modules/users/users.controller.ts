import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import * as service from "./users.service";

const requireUserId = (req: Request): bigint => {
  if (!req.user) throw new HttpError(401, "UNAUTHORIZED", "Missing user context");
  return BigInt(req.user.id);
};

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.getById(requireUserId(req));
  res.json({ user });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.update(requireUserId(req), req.body);
  res.json({ user });
});

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const users = await service.list();
  res.json({ data: users });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await service.create(email, password);
  res.status(201).json({ user });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.getById(BigInt(req.params.id));
  res.json({ user });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.update(BigInt(req.params.id), req.body);
  res.json({ user });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.remove(BigInt(req.params.id));
  res.status(204).send();
});
