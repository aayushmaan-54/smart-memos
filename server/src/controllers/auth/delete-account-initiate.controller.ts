import { OtpCode } from "@/models/otp.code.model";
import { InternalServerError } from "@/utils/api-error";
import { ApiResponse } from "@/utils/api-response";
import { config } from "@/utils/config";
import { generateOTP } from "@/utils/generate-otp";
import { sendEmail } from "@/utils/send-email";
import type { Request, Response } from "express";

export const deleteAccountInitiateController = async (
  req: Request,
  res: Response
) => {
  const user = req.user;

  if (!user) {
    throw new InternalServerError("User data not found on request");
  }

  const deleteAccountOTP = generateOTP(6);

  await OtpCode.deleteMany({
    userId: user._id,
    type: "DELETE_ACCOUNT",
  });

  await OtpCode.create({
    userId: user._id,
    hashedCode: deleteAccountOTP,
    type: "DELETE_ACCOUNT",
    sentAt: new Date(Date.now()),
    expiresAt: new Date(Date.now() + config.auth.otpExpireSeconds * 1000),
  });

  await sendEmail({
    to: user.email,
    subject: "Smart Memos: Delete Account OTP",
    htmlContent: `<p>Your Delete Account OTP is: ${deleteAccountOTP}</p>`,
  });

  const response = new ApiResponse("Delete account OTP sent successfully", {
    statusCode: 201,
    data: {},
  });

  return res.status(response.statusCode).json(response);
};
