import type { Request, Response } from "express";
import { User } from "@/models/user.model.js";
import { addUsernameInRedis, isUsernameRegistered } from "@/lib/redis.js";
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
} from "@/utils/api-error.js";
import { z } from "zod";
import { config } from "@/utils/config.js";
import { ApiResponse } from "@/utils/api-response.js";
import { signUpSchema } from "@/schema/auth.schema";
import { generateOTP } from "@/utils/generate-otp";
import { OtpCode } from "@/models/otp.code.model";
import mongoose from "mongoose";
import { logger } from "@/utils/logger";
import { sendEmail } from "@/utils/send-email";

export const signupController = async (req: Request, res: Response) => {
  const userData = signUpSchema.safeParse(req.body);

  if (!userData.success) {
    throw new BadRequestError("Invalid request body", {
      details: z.treeifyError(userData.error),
    });
  }

  const { username, email, password, optOutAi } = userData.data;

  const isUsernameTaken = await isUsernameRegistered(username);

  if (isUsernameTaken) {
    throw new ConflictError("Username is already taken");
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    if (existingUser.username === username) {
      throw new ConflictError("Username is already taken");
    }
    if (existingUser.email === email) {
      throw new ConflictError("Email is already registered");
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const newUserArr = await User.create(
      [
        {
          username,
          email,
          hashedPassword: password,
          optOutAi,
          isVerified: false,
        },
      ],
      { session }
    );

    const newUser = newUserArr[0];

    if (!newUser) {
      throw new InternalServerError("Failed to create user");
    }

    const emailVerifyOTP = generateOTP(6);

    await sendEmail({
      to: newUser.email as string,
      subject: "Smart Memos: Email Verification OTP",
      htmlContent: `<p>Your Email Verification OTP is: ${emailVerifyOTP}</p>`,
    });

    await OtpCode.create(
      [
        {
          userId: newUser._id,
          hashedCode: emailVerifyOTP,
          type: "EMAIL_VERIFY",
          sentAt: new Date(Date.now()),
          expiresAt: new Date(Date.now() + config.auth.otpExpireSeconds * 1000),
        },
      ],
      { session }
    );

    await session.commitTransaction();

    await addUsernameInRedis(newUser.username);

    const response = new ApiResponse(
      "Email Verification OTP Sent Successfully!",
      {
        statusCode: 201,
        data: {},
      }
    );

    return res.status(response.statusCode).json(response);
  } catch (error) {
    logger.error(error, "ERROR: Signup controller transaction failed");
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
