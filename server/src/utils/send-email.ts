import { InternalServerError } from "./api-error";
import { config } from "./config";
import { transporter } from "./email-transporter";
import { logger } from "./logger";

export async function sendEmail({
  to,
  subject,
  htmlContent,
}: {
  to: string;
  subject: string;
  htmlContent: string;
}) {
  const mailOptions = {
    from: config.nodemailer.user,
    to: to,
    subject: subject,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(error, "Email sending failed");
    throw new InternalServerError("Email sending failed");
  }
}
