import { generateAccessToken, generateRefreshToken } from "@/lib/jwt";
import { RefreshToken } from "@/models/refresh-token.model";
import { User } from "@/models/user.model";
import {
  BadRequestError,
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

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

export const googleCallbackController = async (req: Request, res: Response) => {
  const code = req.query["code"] as string;
  const state = req.query["state"] as string;

  const cookieState = req.cookies[config.googleOauthStateCookieName];
  const connectUserId = req.cookies["oauth_connect_user_id"];

  if (!state || !cookieState || state !== cookieState) {
    throw new BadRequestError("Invalid state parameter. Possible CSRF attack.");
  }

  res.cookie(
    config.googleOauthStateCookieName,
    "",
    clearOAuthStateCookieOptions
  );

  res.cookie("oauth_connect_user_id", "", clearOAuthStateCookieOptions);

  const body = new URLSearchParams({
    code: code,
    client_id: config.oauth.google.clientId,
    client_secret: config.oauth.google.clientSecret,
    redirect_uri: config.oauth.google.redirectUri,
    grant_type: "authorization_code",
  });

  const googleResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body,
  });

  if (!googleResponse.ok) {
    const errorData = await googleResponse.json();
    logger.error(errorData, "Failed to exchange Google code for token");
    throw new InternalServerError("Failed to connect to Google");
  }

  const googleTokens = (await googleResponse.json()) as {
    id_token: string;
    access_token: string;
  };

  let payload;
  try {
    const { payload: verifiedPayload } = await jwtVerify(
      googleTokens.id_token,
      GOOGLE_JWKS,
      {
        issuer: "https://accounts.google.com",
        audience: config.oauth.google.clientId,
      }
    );
    payload = verifiedPayload;
  } catch (error) {
    logger.error(error, "Failed to verify Google ID token");
    throw new UnauthorizedError("Invalid Google token");
  }

  const providerUserId = payload.sub;
  const email = payload["email"] as string;
  const isVerified = payload["email_verified"] as boolean;
  const username = (payload["given_name"] || email.split("@")[0]) as string;
  const avatar = payload["picture"] as string | undefined;

  if (!providerUserId || !email || !isVerified) {
    throw new InternalServerError("Invalid user info from Google");
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
        "identities.provider": "google",
        _id: { $ne: userToLink._id },
      }).session(session);

      if (existingLink) {
        throw new BadRequestError(
          "This Google account is already linked to another user."
        );
      }

      if (userToLink.email !== email) {
        throw new BadRequestError(
          "You must connect a Google account with the same email as your main account."
        );
      }

      userToLink.identities.push({
        provider: "google",
        providerId: providerUserId,
        linkedAt: new Date(),
      });

      if (avatar && !userToLink.avatar) userToLink.avatar = avatar;

      await userToLink.save({ session });

      await session.commitTransaction();

      return res.redirect(config.frontendUrl + "/profile?status=linked-google");
    } else {
      let user;

      user = await User.findOne(
        {
          "identities.providerId": providerUserId,
          "identities.provider": "google",
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
            "An account with this email already exists. Please log in normally and connect your Google account from your profile settings."
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
                    provider: "google",
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
    logger.error(error, "Failed to authenticate with Google");
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
