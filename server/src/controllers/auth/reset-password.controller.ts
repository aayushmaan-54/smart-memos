import { OtpCode } from "@/models/otp.code.model";
import { RefreshToken } from "@/models/refresh-token.model";
import { User } from "@/models/user.model";
import { resetPasswordSchema } from "@/schema/auth.schema";
import { BadRequestError, UnauthorizedError } from "@/utils/api-error";
import { ApiResponse } from "@/utils/api-response";
import { compareHashedEntity } from "@/utils/hash";
import { logger } from "@/utils/logger";
import type { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";

export const resetPasswordController = async (req: Request, res: Response) => {
  const validation = resetPasswordSchema.safeParse(req.body);

  if (!validation.success) {
    throw new BadRequestError("Invalid request body", {
      details: z.treeifyError(validation.error),
    });
  }

  const { identifier, otp, password } = validation.data;

  const user = await User.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  });

  if (!user) {
    throw new UnauthorizedError("Invalid or expired OTP.");
  }

  const token = await OtpCode.findOne({
    userId: user._id,
    type: "PASSWORD_RESET",
    expiresAt: { $gt: new Date() },
  });

  if (!token) {
    throw new UnauthorizedError("Invalid or expired OTP.");
  }

  const isOTPValid = await compareHashedEntity({
    plainText: otp,
    hashedEntity: token.hashedCode,
  });

  if (!isOTPValid) {
    throw new UnauthorizedError("Invalid or expired OTP.");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    user.hashedPassword = password;
    await user.save({ session });

    await OtpCode.deleteOne({ _id: token._id }, { session });

    await RefreshToken.deleteMany({ userId: user._id }, { session });

    await session.commitTransaction();

    const response = new ApiResponse("Password Reset Successfully!", {
      statusCode: 200,
      data: {},
    });

    return res.status(response.statusCode).json(response);
  } catch (error) {
    logger.error(error, "Failed to reset password for user", user._id);
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
