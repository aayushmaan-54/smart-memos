import { InternalServerError } from "@/utils/api-error.js";
import { hashEntity } from "@/utils/hash.js";
import { logger } from "@/utils/logger.js";
import { model, Schema } from "mongoose";

const otpCodeSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  hashedCode: {
    type: String,
    required: true,
  },

  type: {
    type: String,
    enum: ["PASSWORD_RESET", "EMAIL_VERIFY", "DELETE_ACCOUNT"],
    required: true,
  },

  sentAt: {
    type: Date,
    required: true,
    default: Date.now,
  },

  expiresAt: {
    type: Date,
    required: true,
    expires: 0,
  },

  usedAt: {
    type: Date,
    default: null,
  },
});

otpCodeSchema.index({ userId: 1, type: 1 });

otpCodeSchema.pre("save", async function (next) {
  if (!this.isModified("hashedCode")) return next();

  try {
    this.hashedCode = await hashEntity(this.hashedCode);
    next();
  } catch (error) {
    logger.error(error, "Error in pre-save otp code hashing hook.");
    const apiError = new InternalServerError("Failed to process otp code");
    next(apiError);
  }
});

export const OtpCode = model("OtpCode", otpCodeSchema, "otp_codes");
