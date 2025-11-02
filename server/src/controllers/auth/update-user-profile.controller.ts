import {
  addUsernameInRedis,
  isUsernameRegistered,
  removeUsernameFromRedis,
} from "@/lib/redis";
import { User } from "@/models/user.model";
import { updateUsernameSchema } from "@/schema/auth.schema";
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
} from "@/utils/api-error";
import { ApiResponse } from "@/utils/api-response";
import { logger } from "@/utils/logger";
import type { Request, Response } from "express";
import { z } from "zod";

export const updateUserProfileController = async (
  req: Request,
  res: Response
) => {
  const user = req.user;

  if (!user) {
    throw new InternalServerError("User data not found after authentication.");
  }

  const validation = updateUsernameSchema.safeParse(req.body);

  if (!validation.success) {
    throw new BadRequestError("Invalid request body", {
      details: z.treeifyError(validation.error),
    });
  }

  const { username } = validation.data;

  if (username === user.username) {
    throw new BadRequestError("Username is same as before");
  }

  const isUsernameTaken = await isUsernameRegistered(username);

  if (isUsernameTaken) {
    throw new ConflictError("Username is already taken");
  }

  const existingUser = await User.findOne({
    username,
    _id: { $ne: user._id },
  });

  if (existingUser) {
    throw new ConflictError("Username is already taken");
  }

  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    { username },
    {
      new: true,
    }
  ).select("-hashedPassword");

  if (!updatedUser) {
    throw new InternalServerError("Failed to update user profile.");
  }

  try {
    await removeUsernameFromRedis(user.username);
    await addUsernameInRedis(updatedUser.username);
  } catch (redisError) {
    logger.error(redisError, "Failed to update Redis cache for username");
  }

  const response = new ApiResponse("User profile updated successfully", {
    statusCode: 200,
    data: {
      user: updatedUser,
    },
  });

  return res.status(response.statusCode).json(response);
};
