import { Router } from "express";
import { authGuard } from "../../middleware/auth";
import * as controller from "./jobs.controller";

const router = Router();
router.use(authGuard);

router.get("/:id", controller.getJob);
router.get("/:id/download", controller.downloadJobResult);
router.get("/:id/errors.csv", controller.downloadJobErrors);

export default router;
