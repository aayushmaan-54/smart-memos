declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production";
      PORT: string;
      HOST: string;
      PINO_LOG_LEVEL: string;
      CORS_ORIGINS: string;

      JWT_SECRET_KEY: string;
      JWT_ALGORITHM: string;
      ACCESS_TOKEN_EXPIRES_IN: string;
      REFRESH_TOKEN_EXPIRES_IN: string;

      MONGODB_URI: string;
      DB_NAME: string;

      UPSTASH_REDIS_REST_URL: string;
      UPSTASH_REDIS_REST_TOKEN: string;

      OTP_RESEND_WAIT_SECONDS: number;
      OTP_EXPIRE_SECONDS: number;

      GMAIL_USER_EMAIL: string;
      GMAIL_APP_PASSWORD: string;

      GOOGLE_CLIENT_ID: string;
      GOOGLE_CLIENT_SECRET: string;
      GOOGLE_REDIRECT_URI: string;

      MICROSOFT_CLIENT_ID: string;
      MICROSOFT_CLIENT_SECRET: string;
      MICROSOFT_REDIRECT_URI: string;
    }
  }
}

export {};
