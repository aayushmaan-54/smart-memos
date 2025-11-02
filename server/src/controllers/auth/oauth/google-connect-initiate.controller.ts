import { InternalServerError } from "@/utils/api-error";
import { config, oAuthStateCookieOptions } from "@/utils/config";
import type { Request, Response } from "express";
import { randomBytes } from "node:crypto";

export const googleConnectInitiateController = async (
  req: Request,
  res: Response
) => {
  const user = req.user;

  if (!user) {
    throw new InternalServerError("User not found on request.");
  }

  const state = randomBytes(16).toString("hex");

  res.cookie(config.googleOauthStateCookieName, state, oAuthStateCookieOptions);

  res.cookie(
    "oauth_connect_user_id",
    user._id.toString(),
    oAuthStateCookieOptions
  );

  const googleLoginUrl = new URL(
    "https://accounts.google.com/o/oauth2/v2/auth"
  );
  googleLoginUrl.searchParams.set("client_id", config.oauth.google.clientId);
  googleLoginUrl.searchParams.set(
    "redirect_uri",
    config.oauth.google.redirectUri
  );
  googleLoginUrl.searchParams.set("response_type", "code");
  googleLoginUrl.searchParams.set("scope", "openid email profile");
  googleLoginUrl.searchParams.set("state", state);

  res.redirect(googleLoginUrl.toString());
};
