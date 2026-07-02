import type { Express } from "express";
import authRoutes from "./modules/auth/auth.routes";
import usersRoutes from "./modules/users/users.routes";
import categoriesRoutes from "./modules/categories/categories.routes";
import productsRoutes from "./modules/products/products.routes";
import bulkUploadRoutes from "./modules/bulkUpload/bulkUpload.routes";
import reportsRoutes from "./modules/reports/reports.routes";
import jobsRoutes from "./modules/jobs/jobs.routes";

export const mountRoutes = (app: Express): void => {
  const base = "/api/v1";
  app.use(`${base}/auth`, authRoutes);
  app.use(`${base}/users`, usersRoutes);
  app.use(`${base}/categories`, categoriesRoutes);
  app.use(`${base}/products`, productsRoutes);
  // Bulk upload is mounted at root so its path is /products/bulk-upload
  app.use(base, bulkUploadRoutes);
  app.use(`${base}/reports`, reportsRoutes);
  app.use(`${base}/jobs`, jobsRoutes);
};
