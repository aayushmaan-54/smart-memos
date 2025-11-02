import { verifyToken } from "@/lib/jwt";
import { User } from "@/models/user.model";
import { UnauthorizedError } from "@/utils/api-error";
import type { Request, Response, NextFunction } from "express";
import { type JWTPayload } from "jose";

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError(
        "Unauthorized, Please Login to access this resource"
      );
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new UnauthorizedError(
        "Unauthorized, Please Login to access this resource"
      );
    }

    let payload: JWTPayload;
    try {
      const { payload: verifiedPayload } = await verifyToken({ token });
      payload = verifiedPayload as JWTPayload;
    } catch (err) {
      throw new UnauthorizedError(
        "Invalid Token, Please Login again to access this resource"
      );
    }

    if (!payload.sub) {
      throw new UnauthorizedError(
        "Unauthorized, Please Login to access this resource"
      );
    }

    const user = await User.findById(payload.sub).select("-hashedPassword");

    if (!user) {
      throw new UnauthorizedError("Something went wrong, please login again");
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};
