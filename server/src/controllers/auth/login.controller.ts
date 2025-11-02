import type { Request, Response } from "express";
import { User } from "@/models/user.model";
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from "@/utils/api-error.js";
import { z } from "zod";
import { generateAccessToken, generateRefreshToken } from "@/lib/jwt.js";
import { nanoid } from "nanoid";
import { RefreshToken } from "@/models/refresh-token.model.js";
import { config, refreshTokenCookieOptions } from "@/utils/config.js";
import { decodeJwt } from "jose";
import { logger } from "@/utils/logger.js";
import { ApiResponse } from "@/utils/api-response.js";
import { loginSchema } from "@/schema/auth.schema";
import { compareHashedEntity } from "@/utils/hash";

export const loginController = async (req: Request, res: Response) => {
  const userData = loginSchema.safeParse(req.body);

  if (!userData.success) {
    throw new BadRequestError("Invalid request body", {
      details: z.treeifyError(userData.error),
    });
  }

  const { identifier, password } = userData.data;

  const exsistingUserData = await User.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  });

  if (!exsistingUserData) {
    throw new NotFoundError("Invalid credentials!");
  }

  if (exsistingUserData.isVerified === false) {
    throw new ForbiddenError("You need to verify your email first!");
  }

  const isPasswordCorrect = await compareHashedEntity({
    plainText: password,
    hashedEntity: exsistingUserData.hashedPassword,
  });

  if (!isPasswordCorrect) {
    throw new NotFoundError("Invalid credentials!");
  }

  const accessToken = (await generateAccessToken({
    userId: exsistingUserData._id.toString(),
  })) as string;

  const refreshToken = (await generateRefreshToken({
    userId: exsistingUserData._id.toString(),
  })) as string;

  const payload = decodeJwt(refreshToken);

  if (!payload.exp || !payload.iat) {
    logger.error("Token generation failed. Missing required claims.");
    throw new InternalServerError("An unexpected error occurred");
  }

  await RefreshToken.create({
    userId: exsistingUserData._id,
    tokenFamilyId: nanoid(),
    hashedToken: refreshToken,
    issueAt: new Date(payload.iat * 1000),
    expiredAt: new Date(payload.exp * 1000),
    isUsed: false,
    isRevoked: false,
  });

  res.cookie(config.refreshCookieName, refreshToken, refreshTokenCookieOptions);

  const response = new ApiResponse("Login successful!", {
    statusCode: 200,
    data: {
      user: {
        username: exsistingUserData.username,
        email: exsistingUserData.email,
        optOutAi: exsistingUserData.optOutAi,
      },
      accessToken,
    },
  });

  return res.status(response.statusCode).json(response);
};
