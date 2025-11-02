import { generateAccessToken, generateRefreshToken } from "@/lib/jwt";
import { RefreshToken } from "@/models/refresh-token.model";
import { User } from "@/models/user.model";
import { InternalServerError } from "@/utils/api-error";
import { ApiResponse } from "@/utils/api-response";
import { config, refreshTokenCookieOptions } from "@/utils/config";
import { logger } from "@/utils/logger";
import type { Request, Response } from "express";
import { decodeJwt } from "jose";
import mongoose from "mongoose";
import { nanoid } from "nanoid";

export const GuestAuthController = async (_req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [newUser] = await User.create(
      [
        {
          username: `guest-${nanoid(8)}`,
          email: `guest_${nanoid(12)}@guest.smartmemos.app`,
          isGuest: true,
          isVerified: false,
          hashedPassword: null,
          optOutAi: true,
        },
      ],
      { session }
    );

    if (!newUser) {
      throw new InternalServerError("Failed to create guest user");
    }

    const accessToken = (await generateAccessToken({
      userId: newUser._id.toString(),
    })) as string;

    const refreshToken = (await generateRefreshToken({
      userId: newUser._id.toString(),
    })) as string;

    const payload = decodeJwt(refreshToken);

    if (!payload.exp || !payload.iat) {
      logger.error("Token generation failed. Missing required claims.");
      throw new InternalServerError("An unexpected error occurred");
    }

    await RefreshToken.create(
      [
        {
          userId: newUser._id,
          tokenFamilyId: nanoid(),
          hashedToken: refreshToken,
          issueAt: new Date(payload.iat * 1000),
          expiredAt: new Date(payload.exp * 1000),
          isUsed: false,
          isRevoked: false,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    res.cookie(
      config.refreshCookieName,
      refreshToken,
      refreshTokenCookieOptions
    );

    const response = new ApiResponse("Guest login successful!", {
      statusCode: 200,
      data: {
        user: {
          username: newUser.username,
          optOutAi: newUser.optOutAi,
          isGuest: newUser.isGuest,
        },
        accessToken,
      },
    });

    return res.status(response.statusCode).json(response);
  } catch (error) {
    logger.error(error, "ERROR: Guest auth controller transaction failed");
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
