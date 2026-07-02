import { Router } from "express";
import { authGuard } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createSchema,
  updateSchema,
  listQuerySchema,
  uniqueIdParam,
} from "./products.schema";
import * as controller from "./products.controller";

const router = Router();
router.use(authGuard);

router.get("/", validate({ query: listQuerySchema }), controller.list);
router.post(
  "/",
  controller.upload.single("image"),
  validate({ body: createSchema }),
  controller.create
);
router.get("/:uniqueId", validate({ params: uniqueIdParam }), controller.getOne);
router.patch(
  "/:uniqueId",
  controller.upload.single("image"),
  validate({ params: uniqueIdParam, body: updateSchema }),
  controller.update
);
router.delete("/:uniqueId", validate({ params: uniqueIdParam }), controller.remove);

export default router;
