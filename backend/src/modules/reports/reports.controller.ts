import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { HttpError } from "../../utils/httpError";
import { prisma } from "../../db/prisma";
import { reportExportQueue } from "../../queue/connection";
import type { CreateReportInput } from "./reports.schema";

// Returns 202 immediately so we never risk a 504 on large exports.
export const createProductsReport = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new HttpError(401, "UNAUTHORIZED", "Missing user");
  const body = req.body as CreateReportInput;

  const job = await prisma.job.create({
    data: {
      type: "report_export",
      status: "queued",
      createdBy: BigInt(req.user.id),
    },
    select: { id: true },
  });

  await reportExportQueue.add(
    "process",
    {
      jobId: job.id.toString(),
      filters: {
        search: body.search,
        categoryUniqueId: body.categoryUniqueId,
        sort: body.sort,
      },
      format: body.format,
    },
    { removeOnComplete: 100, removeOnFail: 500 }
  );

  res.status(202).json({
    jobId: job.id.toString(),
    status: "queued",
    statusUrl: `/api/v1/jobs/${job.id.toString()}`,
  });
});
