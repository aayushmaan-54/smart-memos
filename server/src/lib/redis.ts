import { config } from "@/utils/config.js";
import { logger } from "@/utils/logger.js";
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: config.redis.restUrl,
  token: config.redis.restToken,
});

export async function isUsernameRegistered(username: string) {
  try {
    const isRegistererd = await redis.sismember("usernames", username);

    if (isRegistererd === 1) {
      logger.info("Username is already registered");
      return true;
    }
    logger.info("Username is not registered");
    return false;
  } catch (error) {
    logger.error(error, "Error checking username registration");
    throw error;
  }
}

export async function addUsernameInRedis(username: string) {
  try {
    await redis.sadd("usernames", username);
    logger.info(`Added ${username} to the set.`);
  } catch (error) {
    logger.error(error, "Error adding username to Redis");
    throw error;
  }
}

export async function removeUsernameFromRedis(username: string) {
  try {
    await redis.srem("usernames", username);
    logger.info(`Removed ${username} from the set.`);
  } catch (error) {
    logger.error(error, "Error removing username from Redis");
    throw error;
  }
}
