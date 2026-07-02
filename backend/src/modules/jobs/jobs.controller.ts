import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";

const parseJobId = (raw: string): bigint => {
  if (!/^\d+$/.test(raw)) throw new HttpError(400, "BAD_REQUEST", "Invalid job id");
  return BigInt(raw);
};

export const getJob = asyncHandler(async (req: Request, res: Response) => {
  const id = parseJobId(req.params.id);
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) throw new HttpError(404, "NOT_FOUND", "Job not found");
  res.json({ job });
});

export const downloadJobResult = asyncHandler(async (req: Request, res: Response) => {
  const id = parseJobId(req.params.id);
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) throw new HttpError(404, "NOT_FOUND", "Job not found");
  if (job.status !== "completed" || !job.resultPath) {
    throw new HttpError(409, "NOT_READY", "Job result not available");
  }
  if (!fs.existsSync(job.resultPath)) {
    throw new HttpError(410, "GONE", "Result file no longer exists");
  }
  res.download(job.resultPath, path.basename(job.resultPath));
});

export const downloadJobErrors = asyncHandler(async (req: Request, res: Response) => {
  const id = parseJobId(req.params.id);
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) throw new HttpError(404, "NOT_FOUND", "Job not found");
  if (job.type !== "bulk_upload") {
    throw new HttpError(400, "BAD_REQUEST", "Errors CSV only for bulk_upload jobs");
  }
  const errorsPath = path.join(env.REPORTS_DIR, `job-${job.id.toString()}-errors.csv`);
  if (!fs.existsSync(errorsPath)) {
    throw new HttpError(404, "NOT_FOUND", "No errors file for this job");
  }
  res.download(errorsPath, `job-${job.id.toString()}-errors.csv`);
});
