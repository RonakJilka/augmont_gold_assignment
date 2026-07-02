import type { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { env } from "../../config/env";
import { asyncHandler } from "../../utils/asyncHandler";
import * as service from "./products.service";

fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, base + ext);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as unknown as service.ListParams;
  const result = await service.list(q);
  res.json(result);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { name, price, categoryUniqueId } = req.body as {
    name: string;
    price: number;
    categoryUniqueId: string;
  };
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
  const product = await service.create({ name, price, categoryUniqueId, imageUrl });
  res.status(201).json({ product });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const product = await service.getByUniqueId(req.params.uniqueId);
  res.json({ product });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as {
    name?: string;
    price?: number;
    categoryUniqueId?: string;
  };
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
  const product = await service.update(req.params.uniqueId, { ...body, imageUrl });
  res.json({ product });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.softDelete(req.params.uniqueId);
  res.status(204).send();
});
