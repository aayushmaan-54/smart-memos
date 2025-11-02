import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { requestLogger } from "./middleware/request-logger.middleware";
import { config } from "./utils/config";
import { logger } from "./utils/logger";
import { NotFoundError } from "./utils/api-error";
import { errorHandler } from "./middleware/error-handler.middleware";
import cookieParser from "cookie-parser";
import { connectToDatabase } from "./lib/db";
import authRouter from "./routes/auth.routes";
import helmet from "helmet";

const app = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

const authLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 30,
  message: "Too many authentication attempts, please try again later.",
});

// Pre Middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(requestLogger);

// Routes
app.get("/ping", apiLimiter, (_req: Request, res: Response) => {
  res.json({ success: true, message: "🟢 PONG" });
});

app.use("/api/v1/auth", authRouter, authLimiter);

// Post Middleware
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError("⛔ Route not found"));
});

app.use(errorHandler);

// Bootstrap Server
async function bootstrap() {
  try {
    await connectToDatabase();

    const server = app.listen(config.port, () => {
      logger.info(`✅ Server is running on ${config.host}:${config.port}`);
    });

    server.on("close", () => {
      logger.info("🛑 HTTP server closed.");
    });
  } catch (error) {
    logger.error(error, "🚨 Fatal startup error. Shutting down application.");
  }
}
bootstrap();
