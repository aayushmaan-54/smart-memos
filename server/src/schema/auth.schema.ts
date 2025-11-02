import { z } from "zod";

export const emailSchema = z
  .email({ message: "Invalid email address" })
  .toLowerCase();

export const usernameSchema = z
  .string()
  .trim()
  .min(3, { message: "Username must be at least 3 characters long" })
  .max(20, { message: "Username must be at most 20 characters long" })
  .toLowerCase()
  .regex(/^[a-zA-Z0-9_.-]{3,20}$/, {
    message:
      "Username must be 3-20 characters and can only contain letters, numbers, _, ., or -",
  });

export const passwordSchema = z
  .string()
  .trim()
  .min(12, { message: "Password must be at least 12 characters long" })
  .max(64, { message: "Password must be at most 64 characters long" })
  .regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[#?!@$%^&* _-]).{12,64}$/, {
    message:
      "Password must contain at least one uppercase, lowercase, number, and special character.",
  });

export const signUpSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  optOutAi: z.boolean().default(false),
});

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, { message: "Email or Username is required" })
    .toLowerCase(),
  password: z.string().trim().min(1, { message: "Password is required" }),
});

export const verifyEmailSchema = z.object({
  email: emailSchema,
  otp: z
    .string()
    .trim()
    .length(6, { message: "OTP must be 6 digits" })
    .regex(/^\d{6}$/, { message: "OTP must only contain numbers" }),
});

export const forgotPasswordSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, { message: "Email or Username is required" })
    .toLowerCase(),
});

export const resetPasswordSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, { message: "Email or Username is required" })
    .toLowerCase(),
  otp: z
    .string()
    .trim()
    .length(6, { message: "OTP must be 6 digits" })
    .regex(/^\d{6}$/, { message: "OTP must only contain numbers" }),
  password: passwordSchema,
});

export const deleteAccountSchema = z.object({
  otp: z
    .string()
    .trim()
    .length(6, { message: "OTP must be 6 digits" })
    .regex(/^\d{6}$/, { message: "OTP must only contain numbers" }),
});

export const resendOtpSchema = z.object({
  email: emailSchema,
  type: z.enum(["PASSWORD_RESET", "EMAIL_VERIFY", "DELETE_ACCOUNT"]),
});

export const updateUsernameSchema = z.object({
  username: usernameSchema,
});

export type SignUpSchemaType = z.infer<typeof signUpSchema>;
export type LoginSchemaType = z.infer<typeof loginSchema>;
export type VerifyEmailSchemaType = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;
export type DeleteAccountSchemaType = z.infer<typeof deleteAccountSchema>;
export type ResendOtpSchemaType = z.infer<typeof resendOtpSchema>;
export type UpdateUsernameSchemaType = z.infer<typeof updateUsernameSchema>;
