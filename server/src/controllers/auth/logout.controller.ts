import type { Request, Response } from "express";
import { clearRefreshTokenCookieOptions, config } from "@/utils/config";
import { ApiResponse } from "@/utils/api-response";
import { hashEntity } from "@/utils/hash";
import { RefreshToken } from "@/models/refresh-token.model";
import { logger } from "@/utils/logger";

export const logoutController = async (req: Request, res: Response) => {
  const clientToken = req.cookies[config.refreshCookieName];

  try {
    if (clientToken) {
      const hashedClientToken = await hashEntity(clientToken);

      await RefreshToken.updateOne(
        { hashedToken: hashedClientToken },
        { $set: { isRevoked: true } }
      );
    }
  } catch (error) {
    logger.error(error, "Failed to revoke token during logout");
  }

  res.cookie(config.refreshCookieName, "", clearRefreshTokenCookieOptions);

  const response = new ApiResponse("Logout successful!", {
    statusCode: 200,
    data: {},
  });

  return res.status(response.statusCode).json(response);
};
