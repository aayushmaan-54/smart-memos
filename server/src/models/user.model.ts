import { model, Schema } from "mongoose";
import { hashEntity } from "@/utils/hash.js";
import { logger } from "@/utils/logger.js";
import { InternalServerError } from "@/utils/api-error.js";

const usersSchema = new Schema(
  {
    username: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9_.-]{3,20}$/,
        "Username must be 3-20 characters and can only contain letters, numbers, _, ., or -",
      ],
    },

    email: {
      type: String,
      nullable: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please fill a valid email address",
      ],
    },

    avatar: {
      type: String,
      nullable: true,
      default: null,
    },

    hashedPassword: {
      type: String,
      nullable: true,
      default: null,
    },

    identities: [
      {
        provider: {
          type: String,
          enum: ["google", "microsoft", "apple"],
          required: true,
        },
        providerId: {
          type: String,
          required: true,
        },
        linkedAt: {
          type: Date,
          required: true,
          default: Date.now,
        },
      },
    ],

    isLoggedOut: {
      type: Boolean,
      default: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isGuest: {
      type: Boolean,
      default: false,
    },

    optOutAi: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

usersSchema.pre("save", async function (next) {
  if (!this.isModified("hashedPassword") || !this.hashedPassword) {
    return next();
  }

  try {
    this.hashedPassword = await hashEntity(this.hashedPassword);
    next();
  } catch (error) {
    logger.error(error, "Error in pre-save password hashing hook.");
    const apiError = new InternalServerError(
      "Failed to process password during signup."
    );
    next(apiError);
  }
});

export const User = model("User", usersSchema, "users");
