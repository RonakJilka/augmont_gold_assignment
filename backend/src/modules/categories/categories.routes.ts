import { Router } from "express";
import { authGuard } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createSchema, updateSchema, listQuerySchema, uniqueIdParam } from "./categories.schema";
import * as controller from "./categories.controller";

const router = Router();
router.use(authGuard);

router.get("/", validate({ query: listQuerySchema }), controller.list);
router.post("/", validate({ body: createSchema }), controller.create);
router.get("/:uniqueId", validate({ params: uniqueIdParam }), controller.getOne);
router.patch(
  "/:uniqueId",
  validate({ params: uniqueIdParam, body: updateSchema }),
  controller.update
);
router.delete("/:uniqueId", validate({ params: uniqueIdParam }), controller.remove);

export default router;
