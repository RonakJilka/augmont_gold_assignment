import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default("24h"),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  PORT: z.coerce.number().default(3000),
  BCRYPT_ROUNDS: z.coerce.number().default(10),
  UPLOAD_DIR: z.string().default("./uploads"),
  TMP_DIR: z.string().default("./tmp"),
  REPORTS_DIR: z.string().default("./reports"),
  NODE_ENV: z.string().default("development"),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
