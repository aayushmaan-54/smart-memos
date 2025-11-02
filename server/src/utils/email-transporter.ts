import nodemailer from "nodemailer";
import { config } from "./config";
import { logger } from "./logger";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.nodemailer.user,
    pass: config.nodemailer.appPassword,
  },
});

transporter.verify(function (error) {
  if (error) {
    logger.error(error, "Transporter verification failed");
  } else {
    logger.info("Email server is ready to take our messages");
  }
});
