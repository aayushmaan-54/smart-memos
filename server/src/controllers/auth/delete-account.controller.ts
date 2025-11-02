import { BadRequestError, InternalServerError } from "@/utils/api-error";
import type { Request, Response } from "express";
import { deleteAccountSchema } from "@/schema/auth.schema";
import { z } from "zod";
import { OtpCode } from "@/models/otp.code.model";
import { compareHashedEntity } from "@/utils/hash";
import { User } from "@/models/user.model";
import { RefreshToken } from "@/models/refresh-token.model";
import { ApiResponse } from "@/utils/api-response";
import mongoose from "mongoose";
import { clearRefreshTokenCookieOptions, config } from "@/utils/config";

export const deleteAccountController = async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new InternalServerError("User data not found on request");
  }

  const validatedData = deleteAccountSchema.safeParse(req.body);

  if (!validatedData.success) {
    throw new BadRequestError("Invalid request body", {
      details: z.treeifyError(validatedData.error),
    });
  }

  const { otp } = validatedData.data;

  const otpDoc = await OtpCode.findOne({
    userId: req.user._id,
    type: "DELETE_ACCOUNT",
    expiresAt: { $gt: new Date() },
  });

  if (!otpDoc) {
    throw new BadRequestError("Invalid OTP");
  }

  const isOtpCorrect = await compareHashedEntity({
    plainText: otp,
    hashedEntity: otpDoc.hashedCode,
  });

  if (!isOtpCorrect) {
    throw new BadRequestError("Invalid OTP");
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await OtpCode.deleteMany({ userId: user._id }, { session });
    await RefreshToken.deleteMany({ userId: user._id }, { session });
    // TODO: Delete user memos
    // TODO: Delete user embeddings
    await User.deleteOne({ _id: user._id }, { session });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  res.cookie(config.refreshCookieName, "", clearRefreshTokenCookieOptions);

  const response = new ApiResponse("Account deleted successfully", {
    statusCode: 200,
    data: {},
  });

  return res.status(response.statusCode).json(response);
};
