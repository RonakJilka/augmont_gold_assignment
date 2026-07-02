import { Router } from "express";
import { authGuard } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createReportSchema } from "./reports.schema";
import { createProductsReport } from "./reports.controller";

const router = Router();
router.use(authGuard);

router.post("/products", validate({ body: createReportSchema }), createProductsReport);

export default router;
