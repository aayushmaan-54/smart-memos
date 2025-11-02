import { config } from "@/utils/config.js";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";

const JWT_SECRET = new TextEncoder().encode(config.jwt.secretKey);
const JWT_ALG = config.jwt.alg;
const ISSUER = `${config.host}:${config.port}`;
const AUDIENCE = `${config.host}:${config.port}`;

export const generateAccessToken = async ({ userId }: { userId: string }) => {
  const payload = {
    sub: userId,
    token_type: "ACCESS_TOKEN",
  };

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(config.jwt.accessExpireIn)
    .sign(JWT_SECRET);

  return jwt;
};

export const generateRefreshToken = async ({ userId }: { userId: string }) => {
  const payload = {
    sub: userId,
    token_type: "REFRESH_TOKEN",
  };

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(config.jwt.refreshExpireIn)
    .sign(JWT_SECRET);

  return jwt;
};

export const verifyToken = async ({
  token,
}: {
  token: string;
}): Promise<JWTPayload> => {
  const { payload } = await jwtVerify(token, JWT_SECRET, {
    algorithms: [JWT_ALG],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return payload;
};
