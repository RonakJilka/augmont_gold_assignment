import IORedis from "ioredis";
import { Queue } from "bullmq";
import { env } from "../config/env";

export const redisConnection = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
});

export const BULK_UPLOAD_QUEUE = "bulk-upload";
export const REPORT_EXPORT_QUEUE = "report-export";

export const bulkUploadQueue = new Queue(BULK_UPLOAD_QUEUE, {
  connection: redisConnection,
});

export const reportExportQueue = new Queue(REPORT_EXPORT_QUEUE, {
  connection: redisConnection,
});
