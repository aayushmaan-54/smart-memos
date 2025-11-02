import { InternalServerError } from "@/utils/api-error";
import { ApiResponse } from "@/utils/api-response";
import type { Request, Response } from "express";

export const getMeController = (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new InternalServerError("User data not found on request");
  }

  const response = new ApiResponse("Login status retrieved successfully", {
    statusCode: 200,
    data: {
      user: {
        username: user.username,
        email: user.email,
        optOutAi: user.optOutAi,
      },
    },
  });

  return res.status(response.statusCode).json(response);
};
