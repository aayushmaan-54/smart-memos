import { InternalServerError } from "@/utils/api-error.js";
import { hashEntity } from "@/utils/hash.js";
import { logger } from "@/utils/logger.js";
import { model, Schema } from "mongoose";

const refreshTokenSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  tokenFamilyId: {
    type: String,
    required: true,
    index: true,
  },

  hashedToken: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  issueAt: {
    type: Date,
    required: true,
    default: Date.now,
  },

  expiredAt: {
    type: Date,
    required: true,
    expires: 0,
  },

  isRevoked: {
    type: Boolean,
    default: false,
  },

  isUsed: {
    type: Boolean,
    default: false,
  },
});

refreshTokenSchema.pre("save", async function (next) {
  if (!this.isModified("hashedToken")) return next();

  try {
    this.hashedToken = await hashEntity(this.hashedToken);
    next();
  } catch (error) {
    logger.error(error, "Error in pre-save refresh token hashing hook.");
    const apiError = new InternalServerError("Failed to process refresh token");
    next(apiError);
  }
});

export const RefreshToken = model(
  "RefreshToken",
  refreshTokenSchema,
  "refresh_tokens"
);
