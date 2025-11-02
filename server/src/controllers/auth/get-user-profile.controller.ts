import { InternalServerError } from "@/utils/api-error";
import { ApiResponse } from "@/utils/api-response";
import type { Request, Response } from "express";

export const getUserProfileController = async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new InternalServerError("User data not found after authentication.");
  }

  const response = new ApiResponse("User profile fetched successfully", {
    statusCode: 200,
    data: {
      user,
    },
  });

  return res.status(response.statusCode).json(response);
};
