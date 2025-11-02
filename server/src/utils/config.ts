import dotenv from "dotenv";
import type { CookieOptions } from "express";
import ms from "ms";

const isProduction = process.env.NODE_ENV === "production";
const maxAge = Number(ms(process.env.REFRESH_TOKEN_EXPIRES_IN as any));

if (!isProduction) {
  dotenv.config({
    path: ".env",
    debug: true,
    override: true,
  });
}

const corsOriginsString = process.env.CORS_ORIGINS || "";

export const config = {
  nodeEnv: process.env.NODE_ENV,
  isDev: process.env.NODE_ENV !== "production",
  host: process.env.HOST || "http://localhost",
  port: process.env.PORT,
  logLevel: process.env.PINO_LOG_LEVEL || "info",

  cors: {
    origins: corsOriginsString.split(",").map((origin) => origin.trim()),
  },

  jwt: {
    secretKey: process.env.JWT_SECRET_KEY,
    alg: process.env.JWT_ALGORITHM,
    accessExpireIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
    refreshExpireIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
  },

  db: {
    uri: process.env.MONGODB_URI,
    name: process.env.DB_NAME,
  },

  redis: {
    restUrl: process.env.UPSTASH_REDIS_REST_URL,
    restToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  },

  auth: {
    otpResendWaitSeconds: process.env.OTP_RESEND_WAIT_SECONDS,
    otpExpireSeconds: process.env.OTP_EXPIRE_SECONDS,
  },

  refreshCookieName: "smartMemos-refresh_token",

  nodemailer: {
    user: process.env.GMAIL_USER_EMAIL,
    appPassword: process.env.GMAIL_APP_PASSWORD,
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      redirectUri: process.env.MICROSOFT_REDIRECT_URI,
    },
  },

  googleOauthStateCookieName: "googleOauthState",
  microsoftOauthStateCookieName: "microsoftOauthState",
  otpResendCoolDownSeconds: 60,

  frontendUrl: "http://localhost:5173",
} as const;

export const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: isProduction ? "/api/v1/auth" : "/",
  maxAge,
  ...(isProduction && { domain: process.env.HOST }),
};

export const clearRefreshTokenCookieOptions: CookieOptions = {
  ...refreshTokenCookieOptions,
  maxAge: undefined,
  expires: new Date(0),
};

export const oAuthStateCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: isProduction ? "/api/v1/auth" : "/",
  maxAge: 300000, // 5 Minutes
  ...(isProduction && { domain: process.env.HOST }),
};

export const clearOAuthStateCookieOptions: CookieOptions = {
  ...oAuthStateCookieOptions,
  maxAge: undefined,
  expires: new Date(0),
};
