import "./utils/bigintJson";
import express from "express";
import cors from "cors";
import path from "path";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { mountRoutes } from "./routes";
import { errorHandler } from "./middleware/error";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ logger }));

app.use("/uploads", express.static(path.resolve(env.UPLOAD_DIR)));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

mountRoutes(app);

app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "http server listening");
});
