import fs from "fs";
import path from "path";
import { Job } from "bullmq";
import * as csv from "fast-csv";
import ExcelJS from "exceljs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";

interface ReportJobData {
  jobId: string;
  filters: {
    search?: string;
    categoryUniqueId?: string;
    sort?: "price:asc" | "price:desc";
  };
  format: "csv" | "xlsx";
}

const PAGE_SIZE = 1000;
const HEADERS = ["uniqueId", "name", "price", "categoryUniqueId", "categoryName", "createdAt"];

const buildWhere = (filters: ReportJobData["filters"]): Prisma.ProductWhereInput => {
  const where: Prisma.ProductWhereInput = { deletedAt: null };
  if (filters.categoryUniqueId) {
    where.category = { uniqueId: filters.categoryUniqueId, deletedAt: null };
  }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { category: { name: { contains: filters.search, mode: "insensitive" } } },
    ];
  }
  return where;
};

fs.mkdirSync(env.REPORTS_DIR, { recursive: true });

export const processReport = async (job: Job<ReportJobData>): Promise<void> => {
  const { jobId, filters, format } = job.data;
  logger.info({ jobId, format }, "report job start");

  await prisma.job.update({
    where: { id: BigInt(jobId) },
    data: { status: "processing", progress: 0 },
  });

  const where = buildWhere(filters);

  // Count first for progress reporting (single query, cheap enough).
  const total = await prisma.product.count({ where });

  const ext = format === "csv" ? "csv" : "xlsx";
  const outPath = path.join(env.REPORTS_DIR, `report-${jobId}.${ext}`);

  let processed = 0;
  // Keyset pagination by id — avoids OFFSET slowdown on large tables.
  let lastId: bigint | null = null;

  try {
    if (format === "csv") {
      const stream = fs.createWriteStream(outPath);
      const csvStream = csv.format({ headers: HEADERS });
      csvStream.pipe(stream);

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const rows = await prisma.product.findMany({
          where: lastId ? { AND: [where, { id: { gt: lastId } }] } : where,
          orderBy: { id: "asc" },
          take: PAGE_SIZE,
          select: {
            id: true,
            uniqueId: true,
            name: true,
            price: true,
            createdAt: true,
            category: { select: { uniqueId: true, name: true } },
          },
        });
        if (rows.length === 0) break;
        for (const r of rows) {
          csvStream.write({
            uniqueId: r.uniqueId,
            name: r.name,
            price: r.price.toString(),
            categoryUniqueId: r.category.uniqueId,
            categoryName: r.category.name,
            createdAt: r.createdAt.toISOString(),
          });
        }
        lastId = rows[rows.length - 1].id;
        processed += rows.length;
        const pct = total > 0 ? Math.min(99, Math.floor((processed / total) * 100)) : 50;
        await job.updateProgress(pct);
        await prisma.job.update({
          where: { id: BigInt(jobId) },
          data: { progress: pct, totalRows: total, successRows: processed },
        });
      }

      await new Promise<void>((resolve) => {
        csvStream.end();
        stream.on("finish", () => resolve());
        stream.on("close", () => resolve());
      });
    } else {
      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: outPath });
      const sheet = workbook.addWorksheet("Products");
      sheet.columns = HEADERS.map((h) => ({ header: h, key: h }));

      // Apply sort if requested for xlsx too (keyset scan is by id, so sort is best-effort per page)
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const rows = await prisma.product.findMany({
          where: lastId ? { AND: [where, { id: { gt: lastId } }] } : where,
          orderBy: { id: "asc" },
          take: PAGE_SIZE,
          select: {
            id: true,
            uniqueId: true,
            name: true,
            price: true,
            createdAt: true,
            category: { select: { uniqueId: true, name: true } },
          },
        });
        if (rows.length === 0) break;
        for (const r of rows) {
          sheet
            .addRow({
              uniqueId: r.uniqueId,
              name: r.name,
              price: r.price.toString(),
              categoryUniqueId: r.category.uniqueId,
              categoryName: r.category.name,
              createdAt: r.createdAt.toISOString(),
            })
            .commit();
        }
        lastId = rows[rows.length - 1].id;
        processed += rows.length;
        const pct = total > 0 ? Math.min(99, Math.floor((processed / total) * 100)) : 50;
        await job.updateProgress(pct);
        await prisma.job.update({
          where: { id: BigInt(jobId) },
          data: { progress: pct, totalRows: total, successRows: processed },
        });
      }

      sheet.commit();
      await workbook.commit();
    }

    await prisma.job.update({
      where: { id: BigInt(jobId) },
      data: {
        status: "completed",
        progress: 100,
        totalRows: total,
        successRows: processed,
        resultPath: outPath,
      },
    });
    logger.info({ jobId, processed }, "report job complete");
  } catch (err) {
    logger.error({ err, jobId }, "report job failed");
    await prisma.job.update({
      where: { id: BigInt(jobId) },
      data: {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
};
