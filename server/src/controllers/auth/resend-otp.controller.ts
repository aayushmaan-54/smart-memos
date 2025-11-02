import { OtpCode } from "@/models/otp.code.model";
import { User } from "@/models/user.model";
import { resendOtpSchema } from "@/schema/auth.schema";
import { BadRequestError } from "@/utils/api-error";
import { ApiResponse } from "@/utils/api-response";
import { config } from "@/utils/config";
import { generateOTP } from "@/utils/generate-otp";
import { logger } from "@/utils/logger";
import { sendEmail } from "@/utils/send-email";
import type { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";

export const resendOTPController = async (req: Request, res: Response) => {
  const validation = resendOtpSchema.safeParse(req.body);

  if (!validation.success) {
    throw new BadRequestError("Invalid request body", {
      details: z.treeifyError(validation.error),
    });
  }

  const { email, type: otpType } = validation.data;

  const userDoc = await User.findOne({ email });

  if (!userDoc) {
    logger.error("User not found");

    const response = new ApiResponse(
      "If an account with that email exists, a new code has been sent.",
      { statusCode: 200 }
    );

    return res.status(response.statusCode).json(response);
  }

  if (otpType === "EMAIL_VERIFY" && userDoc.isVerified) {
    const response = new ApiResponse("Account is already verified.", {
      statusCode: 200,
    });

    return res.status(response.statusCode).json(response);
  }

  const lastOtp = await OtpCode.findOne({
    userId: userDoc._id,
    type: otpType,
  }).sort({
    sentAt: -1,
  });

  if (
    lastOtp &&
    lastOtp.sentAt.getTime() + config.otpResendCoolDownSeconds * 1000 >
      Date.now()
  ) {
    throw new BadRequestError("Please wait a moment before resending.");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await OtpCode.deleteMany(
      { userId: userDoc._id, type: otpType },
      { session }
    );

    const newOtp = generateOTP(6);

    await sendEmail({
      to: userDoc.email as string,
      subject: "Smart Memos: Email Verification OTP",
      htmlContent: `<p>Your Email Verification OTP is: ${newOtp}</p>`,
    });

    await OtpCode.create(
      [
        {
          userId: userDoc._id,
          hashedCode: newOtp,
          type: otpType,
          sentAt: new Date(Date.now()),
          expiresAt: new Date(Date.now() + config.auth.otpExpireSeconds * 1000),
        },
      ],
      { session }
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    logger.error(error, "Failed to resend OTP");
    throw error;
  } finally {
    session.endSession();
  }

  const response = new ApiResponse("OTP Resent Successfully!", {
    statusCode: 201,
    data: {},
  });

  return res.status(response.statusCode).json(response);
};
