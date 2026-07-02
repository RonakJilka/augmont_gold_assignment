import { Router } from "express";
import { validate } from "../../middleware/validate";
import { registerSchema, loginSchema } from "./auth.schema";
import * as controller from "./auth.controller";

const router = Router();

router.post("/register", validate({ body: registerSchema }), controller.register);
router.post("/login", validate({ body: loginSchema }), controller.login);

export default router;
