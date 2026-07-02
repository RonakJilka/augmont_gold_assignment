import { Router } from "express";
import { authGuard } from "../../middleware/auth";
import { upload, bulkUpload } from "./bulkUpload.controller";

const router = Router();
router.use(authGuard);

router.post("/products/bulk-upload", upload.single("file"), bulkUpload);

export default router;
