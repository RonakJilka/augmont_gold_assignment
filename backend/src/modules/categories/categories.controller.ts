import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import * as service from "./categories.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { search, page, limit } = req.query as unknown as {
    search?: string;
    page: number;
    limit: number;
  };
  const result = await service.list({ search, page, limit });
  res.json(result);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body as { name: string };
  const category = await service.create(name);
  res.status(201).json({ category });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const category = await service.getByUniqueId(req.params.uniqueId);
  res.json({ category });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const category = await service.update(req.params.uniqueId, req.body);
  res.json({ category });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.softDelete(req.params.uniqueId);
  res.status(204).send();
});
