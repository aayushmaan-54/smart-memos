import express from "express";
import { signupController } from "@/controllers/auth/signup.controller.js";
import { loginController } from "@/controllers/auth/login.controller.js";
import { logoutController } from "@/controllers/auth/logout.controller";
import { verifyEmailController } from "@/controllers/auth/verify-email.controller";
import { authMiddleware } from "@/middleware/auth.middleware";
import { getMeController } from "@/controllers/auth/auth-status";
import { resetPasswordController } from "@/controllers/auth/reset-password.controller";
import { forgotPasswordController } from "@/controllers/auth/forgot-password";
import { deleteAccountInitiateController } from "@/controllers/auth/delete-account-initiate.controller";
import { googleOauthInitiateController } from "@/controllers/auth/oauth/google-oauth-initiate.controller";
import { googleCallbackController } from "@/controllers/auth/oauth/google-callback.controller";
import { microsoftOauthInitiateController } from "@/controllers/auth/oauth/microsoft-oauth-initiate.controller";
import { microsoftCallbackController } from "@/controllers/auth/oauth/microsoft-callback.controller";
import { deleteAccountController } from "@/controllers/auth/delete-account.controller";
import { rotateRefreshTokenController } from "@/controllers/auth/rotate-refresh-token.controller";
import { GuestAuthController } from "@/controllers/auth/guest-auth.controller";
import { UpgradeAccountController } from "@/controllers/auth/upgrade-account.controller";
import { resendOTPController } from "@/controllers/auth/resend-otp.controller";
import { getUserProfileController } from "@/controllers/auth/get-user-profile.controller";
import { updateUserProfileController } from "@/controllers/auth/update-user-profile.controller";
import { googleConnectInitiateController } from "@/controllers/auth/oauth/google-connect-initiate.controller";
import { microsoftConnectInitiateController } from "@/controllers/auth/oauth/microsoft-connect-initiate.controller";

const authRouter = express.Router();

authRouter.post("/signup", signupController);
authRouter.post("/verify-email", verifyEmailController);
authRouter.post("/login", loginController);
authRouter.post("/logout", logoutController);
authRouter.get("/me", authMiddleware, getMeController);
authRouter.post("/forgot-password", forgotPasswordController);
authRouter.post("/reset-password", resetPasswordController);
authRouter.post(
  "/account/delete/initiate",
  authMiddleware,
  deleteAccountInitiateController
);
authRouter.delete("/users/me", authMiddleware, deleteAccountController);
authRouter.get("/google", googleOauthInitiateController);
authRouter.get(
  "/google/connect",
  authMiddleware,
  googleConnectInitiateController
);
authRouter.get("/google/callback", googleCallbackController);
authRouter.get("/microsoft", microsoftOauthInitiateController);
authRouter.get(
  "/microsoft/connect",
  authMiddleware,
  microsoftConnectInitiateController
);
authRouter.get("/microsoft/callback", microsoftCallbackController);
authRouter.post("/refresh", rotateRefreshTokenController);
authRouter.post("/guest", GuestAuthController);
authRouter.post("/upgrade", authMiddleware, UpgradeAccountController);
authRouter.post("/resend-otp", resendOTPController);
authRouter.get("/profile", authMiddleware, getUserProfileController);
authRouter.patch("/profile", authMiddleware, updateUserProfileController);

export default authRouter;
