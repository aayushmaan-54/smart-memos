import {
  clearOAuthStateCookieOptions,
  config,
  oAuthStateCookieOptions,
} from "@/utils/config";
import type { Request, Response } from "express";
import { randomBytes } from "node:crypto";

export const microsoftOauthInitiateController = async (
  _req: Request,
  res: Response
) => {
  const microsoftOauthState = randomBytes(16).toString("hex");

  res.cookie(
    config.microsoftOauthStateCookieName,
    microsoftOauthState,
    oAuthStateCookieOptions
  );

  res.cookie("oauth_connect_user_id", "", clearOAuthStateCookieOptions);

  const microsoftLoginUrl = new URL(
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
  );

  microsoftLoginUrl.searchParams.set(
    "client_id",
    config.oauth.microsoft.clientId
  );
  microsoftLoginUrl.searchParams.set(
    "redirect_uri",
    config.oauth.microsoft.redirectUri
  );
  microsoftLoginUrl.searchParams.set("response_type", "code");
  microsoftLoginUrl.searchParams.set("scope", "openid email profile User.Read");
  microsoftLoginUrl.searchParams.set("state", microsoftOauthState);

  res.redirect(microsoftLoginUrl.toString());
};
