import { InternalServerError } from "@/utils/api-error";
import { config, oAuthStateCookieOptions } from "@/utils/config";
import type { Request, Response } from "express";
import { randomBytes } from "node:crypto";

export const microsoftConnectInitiateController = async (
  req: Request,
  res: Response
) => {
  const user = req.user;

  if (!user) {
    throw new InternalServerError("User not found on request.");
  }

  const state = randomBytes(16).toString("hex");

  res.cookie(
    config.microsoftOauthStateCookieName,
    state,
    oAuthStateCookieOptions
  );

  res.cookie(
    "oauth_connect_user_id",
    user._id.toString(),
    oAuthStateCookieOptions
  );

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

  microsoftLoginUrl.searchParams.set("state", state);

  res.redirect(microsoftLoginUrl.toString());
};
