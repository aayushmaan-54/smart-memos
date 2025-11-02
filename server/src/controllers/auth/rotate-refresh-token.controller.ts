import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "@/lib/jwt";
import { RefreshToken } from "@/models/refresh-token.model";
import { User } from "@/models/user.model";
import { InternalServerError, UnauthorizedError } from "@/utils/api-error";
import { ApiResponse } from "@/utils/api-response";
import { config, refreshTokenCookieOptions } from "@/utils/config";
import { hashEntity } from "@/utils/hash";
import { logger } from "@/utils/logger";
import type { Request, Response } from "express";
import { decodeJwt, type JWTPayload } from "jose";
import mongoose from "mongoose";

export const rotateRefreshTokenController = async (
  req: Request,
  res: Response
) => {
  const clientRefreshTokenCookie = req.cookies[config.refreshCookieName];

  if (!clientRefreshTokenCookie) {
    throw new UnauthorizedError("Unauthorized!");
  }

  let payload: JWTPayload;
  try {
    const { payload: verifiedPayload } = await verifyToken({
      token: clientRefreshTokenCookie,
    });

    payload = verifiedPayload as JWTPayload;
  } catch (err) {
    throw new UnauthorizedError("Unauthorized!");
  }

  if (!payload.sub) {
    throw new UnauthorizedError("Unauthorized!");
  }

  const user = await User.findById(payload.sub).select("-hashedPassword");

  if (!user) {
    throw new UnauthorizedError("Something went wrong, please login again");
  }

  const hashedClientToken = await hashEntity(clientRefreshTokenCookie);

  const refreshToken = await RefreshToken.findOne({
    hashedToken: hashedClientToken,
    userId: user._id,
  });

  if (!refreshToken) {
    throw new UnauthorizedError("Unauthorized!");
  }

  if (refreshToken.isRevoked) {
    throw new UnauthorizedError("Unauthorized!");
  }

  if (refreshToken.expiredAt < new Date()) {
    throw new UnauthorizedError("Unauthorized!");
  }

  if (refreshToken.isUsed) {
    await RefreshToken.updateMany(
      { tokenFamilyId: refreshToken.tokenFamilyId, userId: user._id },
      { $set: { isRevoked: true } }
    );

    throw new UnauthorizedError("Unauthorized!");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (refreshToken.isUsed === false) {
      refreshToken.isUsed = true;
      await refreshToken.save({ session });
    }

    const newAccessToken = (await generateAccessToken({
      userId: user._id.toString(),
    })) as string;

    const newRefreshToken = (await generateRefreshToken({
      userId: user._id.toString(),
    })) as string;

    const newPayload = decodeJwt(newRefreshToken);

    if (!newPayload.exp || !newPayload.iat) {
      logger.error("Token generation failed. Missing required claims.");
      throw new InternalServerError("An unexpected error occurred");
    }

    await RefreshToken.create(
      [
        {
          userId: user._id,
          tokenFamilyId: refreshToken.tokenFamilyId,
          hashedToken: newRefreshToken,
          issueAt: new Date(newPayload.iat * 1000),
          expiredAt: new Date(newPayload.exp * 1000),
          isUsed: false,
          isRevoked: false,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    res.cookie(
      config.refreshCookieName,
      newRefreshToken,
      refreshTokenCookieOptions
    );

    const response = new ApiResponse("Refresh token rotated successfully!", {
      statusCode: 200,
      data: {
        accessToken: newAccessToken,
      },
    });

    return res.status(response.statusCode).json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
