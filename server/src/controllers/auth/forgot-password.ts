import type { Request, Response } from "express";
import { BadRequestError } from "@/utils/api-error";
import { z } from "zod";
import { forgotPasswordSchema } from "@/schema/auth.schema";
import { User } from "@/models/user.model";
import { ApiResponse } from "@/utils/api-response";
import { generateOTP } from "@/utils/generate-otp";
import { config } from "@/utils/config";
import { sendEmail } from "@/utils/send-email";
import { logger } from "@/utils/logger";
import { OtpCode } from "@/models/otp.code.model";

export const forgotPasswordController = async (req: Request, res: Response) => {
  const validation = forgotPasswordSchema.safeParse(req.body);

  if (!validation.success) {
    throw new BadRequestError("Invalid request body", {
      details: z.treeifyError(validation.error),
    });
  }

  const { identifier } = validation.data;

  const user = await User.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  });

  if (user) {
    try {
      const resetPasswordOTP = generateOTP(6);

      await OtpCode.create({
        userId: user._id,
        hashedCode: resetPasswordOTP,
        type: "PASSWORD_RESET",
        sentAt: new Date(Date.now()),
        expiresAt: new Date(Date.now() + config.auth.otpExpireSeconds * 1000),
      });

      await sendEmail({
        to: user.email as string,
        subject: "Smart Memos: Reset Password OTP",
        htmlContent: `<p>Your Reset Password OTP is: ${resetPasswordOTP}</p>`,
      });
    } catch (error) {
      logger.error(error, "Failed to send password reset for user", user._id);
    }
  }

  const response = new ApiResponse(
    "If that user exists, a password reset email has been sent.",
    {
      statusCode: 200,
      data: {},
    }
  );

  return res.status(response.statusCode).json(response);
};
