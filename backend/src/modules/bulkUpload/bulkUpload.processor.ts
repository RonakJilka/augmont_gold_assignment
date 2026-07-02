import fs from "fs";
import path from "path";
import { Job } from "bullmq";
import * as csv from "fast-csv";
import ExcelJS from "exceljs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { productId } from "../../utils/uniqueId";
import { logger } from "../../utils/logger";

const rowSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.coerce.number().min(0),
  categoryUniqueId: z.string().regex(/^CAT-[A-Z0-9]{6}$/),
});

interface JobData {
  jobId: string;
  filePath: string;
  originalName: string;
  mimeType: string;
}

interface ParsedRow {
  rowNum: number;
  name: string;
  price: number;
  categoryUniqueId: string;
}

interface ErrorRow {
  row: number;
  name: string;
  price: string;
  categoryUniqueId: string;
  error: string;
}

const BATCH_SIZE = 500;

fs.mkdirSync(env.REPORTS_DIR, { recursive: true });

const openErrorWriter = (jobId: string) => {
  const errorsPath = path.join(env.REPORTS_DIR, `job-${jobId}-errors.csv`);
  const stream = fs.createWriteStream(errorsPath);
  const csvStream = csv.format({ headers: true });
  csvStream.pipe(stream);
  return { errorsPath, csvStream, stream };
};

const isXlsx = (mime: string, name: string): boolean =>
  mime.includes("spreadsheet") ||
  mime.includes("excel") ||
  name.toLowerCase().endsWith(".xlsx");

export const processBulkUpload = async (job: Job<JobData>): Promise<void> => {
  const { jobId, filePath, originalName, mimeType } = job.data;
  logger.info({ jobId, filePath }, "bulk upload start");

  await prisma.job.update({
    where: { id: BigInt(jobId) },
    data: { status: "processing", progress: 0 },
  });

  const categoryCache = new Map<string, bigint | null>();
  const getCategoryId = async (uniqueId: string): Promise<bigint | null> => {
    if (categoryCache.has(uniqueId)) return categoryCache.get(uniqueId) ?? null;
    const cat = await prisma.category.findFirst({
      where: { uniqueId, deletedAt: null },
      select: { id: true },
    });
    const val = cat?.id ?? null;
    categoryCache.set(uniqueId, val);
    return val;
  };

  let total = 0;
  let success = 0;
  let failed = 0;
  const errorWriter = openErrorWriter(jobId);
  let hasErrors = false;
  let buffer: ParsedRow[] = [];

  const flushBuffer = async () => {
    if (buffer.length === 0) return;
    const rows: Prisma.ProductCreateManyInput[] = [];
    for (const r of buffer) {
      const categoryId = await getCategoryId(r.categoryUniqueId);
      if (!categoryId) {
        failed++;
        hasErrors = true;
        errorWriter.csvStream.write({
          row: r.rowNum,
          name: r.name,
          price: r.price,
          categoryUniqueId: r.categoryUniqueId,
          error: "Category not found",
        } satisfies ErrorRow);
        continue;
      }
      rows.push({
        uniqueId: productId(),
        name: r.name,
        price: new Prisma.Decimal(r.price),
        categoryId,
      });
    }
    if (rows.length > 0) {
      const result = await prisma.product.createMany({
        data: rows,
        skipDuplicates: true,
      });
      success += result.count;
    }
    buffer = [];
  };

  const writeError = (row: ErrorRow) => {
    hasErrors = true;
    failed++;
    errorWriter.csvStream.write(row);
  };

  try {
    if (isXlsx(mimeType, originalName)) {
      // Streaming XLSX reader
      const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
        entries: "emit",
        sharedStrings: "cache",
        worksheets: "emit",
      });
      let header: string[] = [];
      for await (const worksheet of workbookReader) {
        for await (const row of worksheet) {
          total++;
          const values = (row.values as unknown[]).slice(1) as unknown[];
          if (total === 1) {
            header = values.map((v) => String(v ?? "").trim());
            total = 0; // header does not count
            continue;
          }
          const rec: Record<string, string> = {};
          header.forEach((h, i) => {
            rec[h] = values[i] === undefined || values[i] === null ? "" : String(values[i]);
          });
          const parsed = rowSchema.safeParse(rec);
          if (!parsed.success) {
            writeError({
              row: total + 1,
              name: rec.name ?? "",
              price: rec.price ?? "",
              categoryUniqueId: rec.categoryUniqueId ?? "",
              error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
            });
            continue;
          }
          buffer.push({ rowNum: total + 1, ...parsed.data });
          if (buffer.length >= BATCH_SIZE) {
            await flushBuffer();
            await job.updateProgress(Math.min(99, Math.floor((success + failed) / Math.max(total, 1) * 100)));
            await prisma.job.update({
              where: { id: BigInt(jobId) },
              data: {
                progress: Math.min(99, Math.floor((success + failed) / Math.max(total, 1) * 100)),
                totalRows: total,
                successRows: success,
                failedRows: failed,
              },
            });
          }
        }
      }
    } else {
      // CSV
      await new Promise<void>((resolve, reject) => {
        const stream = fs
          .createReadStream(filePath)
          .pipe(csv.parse({ headers: true, trim: true }))
          .on("error", reject)
          .on("data", (rec: Record<string, string>) => {
            total++;
            const parsed = rowSchema.safeParse(rec);
            if (!parsed.success) {
              writeError({
                row: total + 1,
                name: rec.name ?? "",
                price: rec.price ?? "",
                categoryUniqueId: rec.categoryUniqueId ?? "",
                error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
              });
              return;
            }
            buffer.push({ rowNum: total + 1, ...parsed.data });
            if (buffer.length >= BATCH_SIZE) {
              stream.pause();
              flushBuffer()
                .then(async () => {
                  await prisma.job.update({
                    where: { id: BigInt(jobId) },
                    data: {
                      progress: Math.min(99, Math.floor((success + failed) / Math.max(total, 1) * 100)),
                      totalRows: total,
                      successRows: success,
                      failedRows: failed,
                    },
                  });
                  stream.resume();
                })
                .catch(reject);
            }
          })
          .on("end", () => resolve());
      });
    }

    await flushBuffer();

    await new Promise<void>((resolve) => {
      errorWriter.csvStream.end();
      errorWriter.stream.on("finish", () => resolve());
      errorWriter.stream.on("close", () => resolve());
    });

    await prisma.job.update({
      where: { id: BigInt(jobId) },
      data: {
        status: "completed",
        progress: 100,
        totalRows: total,
        successRows: success,
        failedRows: failed,
        resultPath: hasErrors ? errorWriter.errorsPath : null,
      },
    });

    // Best-effort cleanup of uploaded tmp file
    fs.promises.unlink(filePath).catch(() => undefined);

    logger.info({ jobId, total, success, failed }, "bulk upload complete");
  } catch (err) {
    logger.error({ err, jobId }, "bulk upload failed");
    try {
      errorWriter.csvStream.end();
    } catch {
      /* noop */
    }
    await prisma.job.update({
      where: { id: BigInt(jobId) },
      data: {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        totalRows: total,
        successRows: success,
        failedRows: failed,
      },
    });
    throw err;
  }
};
