import { hash, compare, genSalt } from "bcrypt";
import { logger } from "./logger";
import { InternalServerError } from "./api-error.js";

const SALT_ROUNDS = 12;

export const hashEntity = async (plainText: string) => {
  try {
    const salt = await genSalt(SALT_ROUNDS);
    const hashedString = await hash(plainText, salt);
    return hashedString;
  } catch (error) {
    logger.error(error, "Error in hashEntity");
    throw new InternalServerError("An unexpected error occurred");
  }
};

export const compareHashedEntity = async ({
  plainText,
  hashedEntity,
}: {
  plainText: string;
  hashedEntity: string;
}) => {
  try {
    const isMatch = await compare(plainText, hashedEntity);
    return isMatch;
  } catch (error) {
    logger.error(error, "Error in compareHashedEntity");
    throw new InternalServerError("An unexpected error occurred");
  }
};
