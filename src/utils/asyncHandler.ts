import type { NextFunction, Request, Response } from "express";

export type AsyncHandler<Req = Request, Res = Response> = (
  req: Req,
  res: Res,
  next: NextFunction
) => Promise<unknown>;

const asyncHandler =
  <Req extends Request = Request, Res extends Response = Response>(
    handler: AsyncHandler<Req, Res>
  ) =>
  (req: Req, res: Res, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };

export default asyncHandler;
