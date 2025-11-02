import { generateAccessToken, generateRefreshToken } from "@/lib/jwt";
import { RefreshToken } from "@/models/refresh-token.model";
import { User } from "@/models/user.model";
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
  UnauthorizedError,
} from "@/utils/api-error";
import { ApiResponse } from "@/utils/api-response";
import {
  clearOAuthStateCookieOptions,
  config,
  refreshTokenCookieOptions,
} from "@/utils/config";
import { logger } from "@/utils/logger";
import type { Request, Response } from "express";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import mongoose from "mongoose";
import { nanoid } from "nanoid";

const MICROSOFT_JWKS = createRemoteJWKSet(
  new URL("https://login.microsoftonline.com/common/discovery/v2.0/keys")
);

export const microsoftCallbackController = async (
  req: Request,
  res: Response
) => {
  const code = req.query["code"] as string;
  const state = req.query["state"] as string;

  const cookieState = req.cookies[config.microsoftOauthStateCookieName];
  const connectUserId = req.cookies["oauth_connect_user_id"];

  if (!state || !cookieState || state !== cookieState) {
    throw new BadRequestError("Invalid state parameter. Possible CSRF attack.");
  }

  res.cookie(
    config.microsoftOauthStateCookieName,
    "",
    clearOAuthStateCookieOptions
  );

  res.cookie("oauth_connect_user_id", "", clearOAuthStateCookieOptions);

  const body = new URLSearchParams({
    code: code,
    client_id: config.oauth.microsoft.clientId,
    client_secret: config.oauth.microsoft.clientSecret,
    redirect_uri: config.oauth.microsoft.redirectUri,
    grant_type: "authorization_code",
  });

  const microsoftResponse = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body,
    }
  );

  if (!microsoftResponse.ok) {
    const errorData = await microsoftResponse.json();
    logger.error(errorData, "Failed to exchange Microsoft code for token");
    throw new InternalServerError("Failed to connect to Microsoft");
  }

  const microsoftTokens = (await microsoftResponse.json()) as {
    id_token: string;
    access_token: string;
  };

  let payload;
  try {
    const { payload: verifiedPayload } = await jwtVerify(
      microsoftTokens.id_token,
      MICROSOFT_JWKS,
      {
        audience: config.oauth.microsoft.clientId,
      }
    );

    if (
      !verifiedPayload.iss ||
      !verifiedPayload.iss.startsWith("https://login.microsoftonline.com/")
    ) {
      throw new Error("Invalid token issuer");
    }

    payload = verifiedPayload;
  } catch (error) {
    logger.error(error, "Failed to verify Microsoft ID token");
    throw new UnauthorizedError("Invalid Microsoft token");
  }

  const providerUserId = payload.sub;
  const email = (payload["email"] || payload["preferred_username"]) as string;
  const username = (payload["name"] || email.split("@")[0]) as string;
  const avatar = undefined;

  if (!providerUserId || !email) {
    throw new InternalServerError("Invalid user info from Microsoft");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (connectUserId) {
      const userToLink = await User.findById(connectUserId).session(session);

      if (!userToLink) {
        throw new InternalServerError("Logged in user not found.");
      }

      const existingLink = await User.findOne({
        "identities.providerId": providerUserId,
        "identities.provider": "microsoft",
        _id: { $ne: userToLink._id },
      }).session(session);

      if (existingLink) {
        throw new ConflictError(
          "This Microsoft account is already linked to another user."
        );
      }

      if (userToLink.email !== email) {
        throw new BadRequestError(
          "You must connect a Microsoft account with the same email as your main account."
        );
      }

      userToLink.identities.push({
        provider: "microsoft",
        providerId: providerUserId,
        linkedAt: new Date(),
      });

      await userToLink.save({ session });
      await session.commitTransaction();

      return res.redirect(
        config.frontendUrl + "/profile?status=linked-microsoft"
      );
    } else {
      let user;

      user = await User.findOne(
        {
          "identities.providerId": providerUserId,
          "identities.provider": "microsoft",
        },
        null,
        { session }
      );

      if (!user) {
        const existingUserByEmail = await User.findOne({ email }, null, {
          session,
        });

        if (existingUserByEmail) {
          throw new BadRequestError(
            "An account with this email already exists. Please log in normally and connect your Microsoft account from your profile settings."
          );
        } else {
          const userArr = await User.create(
            [
              {
                username,
                email,
                avatar,
                identities: [
                  {
                    provider: "microsoft",
                    providerId: providerUserId,
                    linkedAt: new Date(),
                  },
                ],
                isVerified: true,
                optOutAi: false,
              },
            ],
            { session }
          );

          user = userArr[0];
        }
      }

      if (!user) {
        throw new InternalServerError("Failed to find or create user.");
      }

      const accessToken = (await generateAccessToken({
        userId: user._id.toString(),
      })) as string;

      const refreshToken = (await generateRefreshToken({
        userId: user._id.toString(),
      })) as string;

      const refreshPayload = decodeJwt(refreshToken);

      if (!refreshPayload.exp || !refreshPayload.iat) {
        logger.error("Token generation failed. Missing required claims.");
        throw new InternalServerError("An unexpected error occurred");
      }

      await RefreshToken.create(
        [
          {
            userId: user._id,
            tokenFamilyId: nanoid(),
            hashedToken: refreshToken,
            issueAt: new Date(refreshPayload.iat * 1000),
            expiredAt: new Date(refreshPayload.exp * 1000),
            isUsed: false,
            isRevoked: false,
          },
        ],
        { session }
      );

      await session.commitTransaction();

      res.cookie(
        config.refreshCookieName,
        refreshToken,
        refreshTokenCookieOptions
      );

      const response = new ApiResponse("Authentication successful!", {
        statusCode: 200,
        data: {
          user: {
            username: user.username,
            email: user.email,
            optOutAi: user.optOutAi,
          },
          accessToken,
        },
      });

      return res.status(response.statusCode).json(response);
    }
  } catch (error) {
    logger.error(error, "Failed to authenticate with Microsoft");
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
