import { generateAccessToken, generateRefreshToken } from "@/lib/jwt";
import { OtpCode } from "@/models/otp.code.model";
import { RefreshToken } from "@/models/refresh-token.model";
import { User } from "@/models/user.model";
import { verifyEmailSchema } from "@/schema/auth.schema";
import { BadRequestError, InternalServerError } from "@/utils/api-error";
import { ApiResponse } from "@/utils/api-response";
import { config, refreshTokenCookieOptions } from "@/utils/config";
import { compareHashedEntity } from "@/utils/hash";
import { logger } from "@/utils/logger";
import type { Request, Response } from "express";
import { decodeJwt } from "jose";
import mongoose from "mongoose";
import { nanoid } from "nanoid";
import { z } from "zod";

export const verifyEmailController = async (req: Request, res: Response) => {
  const validation = verifyEmailSchema.safeParse(req.body);

  if (!validation.success) {
    throw new BadRequestError("Invalid request body", {
      details: z.treeifyError(validation.error),
    });
  }

  const { email, otp } = validation.data;

  const user = await User.findOne({ email });

  if (!user) {
    throw new BadRequestError("Invalid or expired OTP.");
  }

  if (user.isVerified) {
    throw new BadRequestError("Account is already verified.");
  }

  const otpDoc = await OtpCode.findOne({
    userId: user._id,
    type: "EMAIL_VERIFY",
    expiresAt: { $gt: new Date() },
  });

  if (!otpDoc) {
    throw new BadRequestError("Invalid or expired OTP.");
  }

  const isMatch = await compareHashedEntity({
    plainText: otp,
    hashedEntity: otpDoc.hashedCode,
  });

  if (!isMatch) {
    throw new BadRequestError("Invalid or expired OTP.");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    user.isVerified = true;
    await user.save({ session });

    const accessToken = (await generateAccessToken({
      userId: user._id.toString(),
    })) as string;

    const refreshToken = (await generateRefreshToken({
      userId: user._id.toString(),
    })) as string;

    const payload = decodeJwt(refreshToken);
    if (!payload.exp || !payload.iat) {
      throw new InternalServerError("Error decoding refresh token");
    }

    await RefreshToken.create(
      [
        {
          userId: user._id,
          tokenFamilyId: nanoid(),
          hashedToken: refreshToken,
          issueAt: new Date(payload.iat * 1000),
          expiredAt: new Date(payload.exp * 1000),
        },
      ],
      { session }
    );

    await OtpCode.deleteOne({ _id: otpDoc._id }, { session });

    await session.commitTransaction();

    res.cookie(
      config.refreshCookieName,
      refreshToken,
      refreshTokenCookieOptions
    );

    const response = new ApiResponse(
      "Email verified successfully! You are now logged in.",
      {
        statusCode: 200,
        data: {
          user: {
            username: user.username,
            email: user.email,
            optOutAi: user.optOutAi,
          },
          accessToken,
        },
      }
    );

    return res.status(response.statusCode).json(response);
  } catch (error) {
    logger.error(error, "ERROR: Verify OTP transaction failed");
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
