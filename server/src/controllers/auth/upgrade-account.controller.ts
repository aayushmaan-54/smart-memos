import { addUsernameInRedis, isUsernameRegistered } from "@/lib/redis";
import { OtpCode } from "@/models/otp.code.model";
import { User } from "@/models/user.model";
import { signUpSchema } from "@/schema/auth.schema";
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
} from "@/utils/api-error";
import { ApiResponse } from "@/utils/api-response";
import { config } from "@/utils/config";
import { generateOTP } from "@/utils/generate-otp";
import { logger } from "@/utils/logger";
import { sendEmail } from "@/utils/send-email";
import type { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";

export const UpgradeAccountController = async (req: Request, res: Response) => {
  const guestUser = req.user;
  if (!guestUser) {
    throw new BadRequestError("Guest user not found on request.");
  }

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
    _id: { $ne: guestUser._id },
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

  let userToUpgrade;
  try {
    userToUpgrade = await User.findById(guestUser._id).session(session);

    if (!userToUpgrade) {
      throw new InternalServerError("Failed to find guest user for upgrade.");
    }

    userToUpgrade.username = username;
    userToUpgrade.email = email;
    userToUpgrade.hashedPassword = password;
    userToUpgrade.optOutAi = optOutAi;
    userToUpgrade.isGuest = false;
    userToUpgrade.isVerified = false;

    await userToUpgrade.save({ session });

    const emailVerifyOTP = generateOTP(6);

    await sendEmail({
      to: userToUpgrade.email as string,
      subject: "Smart Memos: Email Verification OTP",
      htmlContent: `<p>Your Email Verification OTP is: ${emailVerifyOTP}</p>`,
    });

    await OtpCode.create(
      [
        {
          userId: userToUpgrade._id,
          hashedCode: emailVerifyOTP,
          type: "EMAIL_VERIFY",
          sentAt: new Date(Date.now()),
          expiresAt: new Date(Date.now() + config.auth.otpExpireSeconds * 1000),
        },
      ],
      { session }
    );

    await session.commitTransaction();
  } catch (error) {
    logger.error(error, "ERROR: Upgrade account controller transaction failed");
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }

  try {
    await addUsernameInRedis(userToUpgrade.username);
  } catch (redisError) {
    logger.error(
      redisError,
      "Failed to update Redis cache after account upgrade"
    );
  }

  const response = new ApiResponse(
    "Account upgraded! Please check your email to verify.",
    {
      statusCode: 200,
      data: {},
    }
  );

  return res.status(response.statusCode).json(response);
};
