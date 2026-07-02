import { Router } from "express";
import { authGuard } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createSchema, updateSchema, idParam } from "./users.schema";
import * as controller from "./users.controller";

const router = Router();

router.use(authGuard);

router.get("/me", controller.me);
router.patch("/me", validate({ body: updateSchema }), controller.updateMe);

router.get("/", controller.list);
router.post("/", validate({ body: createSchema }), controller.create);
router.get("/:id", validate({ params: idParam }), controller.getOne);
router.patch("/:id", validate({ params: idParam, body: updateSchema }), controller.update);
router.delete("/:id", validate({ params: idParam }), controller.remove);

export default router;
