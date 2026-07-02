import type { Request, Response, NextFunction, RequestHandler } from "express";
import { z, ZodTypeAny } from "zod";

interface Shape {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export const validate = (shape: Shape): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (shape.body) req.body = shape.body.parse(req.body);
      if (shape.query) {
        const parsed = shape.query.parse(req.query);
        Object.assign(req.query, parsed);
      }
      if (shape.params) {
        const parsed = shape.params.parse(req.params);
        Object.assign(req.params, parsed);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

export { z };
