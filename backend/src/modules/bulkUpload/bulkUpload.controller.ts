import type { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { env } from "../../config/env";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { prisma } from "../../db/prisma";
import { bulkUploadQueue } from "../../queue/connection";

fs.mkdirSync(env.TMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.TMP_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `bulk-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Returns 202 immediately: worker does the heavy work so HTTP never times out (no 504).
export const bulkUpload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new HttpError(400, "BAD_REQUEST", "Missing file");
  if (!req.user) throw new HttpError(401, "UNAUTHORIZED", "Missing user");

  const job = await prisma.job.create({
    data: {
      type: "bulk_upload",
      status: "queued",
      createdBy: BigInt(req.user.id),
    },
    select: { id: true },
  });

  await bulkUploadQueue.add(
    "process",
    {
      jobId: job.id.toString(),
      filePath: req.file.path,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    },
    { removeOnComplete: 100, removeOnFail: 500 }
  );

  res.status(202).json({
    jobId: job.id.toString(),
    status: "queued",
    statusUrl: `/api/v1/jobs/${job.id.toString()}`,
  });
});
