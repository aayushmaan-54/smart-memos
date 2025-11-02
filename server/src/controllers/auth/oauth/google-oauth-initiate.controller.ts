import {
  clearOAuthStateCookieOptions,
  config,
  oAuthStateCookieOptions,
} from "@/utils/config";
import type { Request, Response } from "express";
import { randomBytes } from "node:crypto";

export const googleOauthInitiateController = async (
  _req: Request,
  res: Response
) => {
  const googleOauthState = randomBytes(16).toString("hex");

  res.cookie(
    config.googleOauthStateCookieName,
    googleOauthState,
    oAuthStateCookieOptions
  );

  res.cookie("oauth_connect_user_id", "", clearOAuthStateCookieOptions);

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
  googleLoginUrl.searchParams.set("state", googleOauthState);

  console.log("googleLoginUrl: ", googleLoginUrl.toString());

  res.redirect(googleLoginUrl.toString());
};
