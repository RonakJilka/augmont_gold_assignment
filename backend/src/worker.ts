import "./utils/bigintJson";
import { Worker } from "bullmq";
import { redisConnection, BULK_UPLOAD_QUEUE, REPORT_EXPORT_QUEUE } from "./queue/connection";
import { processBulkUpload } from "./modules/bulkUpload/bulkUpload.processor";
import { processReport } from "./modules/reports/reports.processor";
import { logger } from "./utils/logger";

const bulkWorker = new Worker(BULK_UPLOAD_QUEUE, processBulkUpload, {
  connection: redisConnection,
  concurrency: 2,
});

const reportWorker = new Worker(REPORT_EXPORT_QUEUE, processReport, {
  connection: redisConnection,
  concurrency: 2,
});

for (const [name, w] of [
  ["bulk-upload", bulkWorker],
  ["report-export", reportWorker],
] as const) {
  w.on("active", (job) => logger.info({ queue: name, jobId: job.id }, "job active"));
  w.on("completed", (job) => logger.info({ queue: name, jobId: job.id }, "job completed"));
  w.on("failed", (job, err) =>
    logger.error({ queue: name, jobId: job?.id, err }, "job failed")
  );
}

const shutdown = async (): Promise<void> => {
  logger.info("worker shutting down");
  await Promise.all([bulkWorker.close(), reportWorker.close()]);
  await redisConnection.quit();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

logger.info("worker started");
