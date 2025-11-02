import { config } from "@/utils/config.js";
import { logger } from "@/utils/logger.js";
import { ServerApiVersion } from "mongodb";
import mongoose from "mongoose";

if (!config.db.uri) {
  logger.error("MONGODB_URI is not defined in environment variables");
  throw new Error("MONGODB_URI is not defined in environment variables");
}

const options: mongoose.ConnectOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

let isConnected = false;
export async function connectToDatabase() {
  try {
    if (isConnected) {
      logger.info("✅ Database already connected");
      return;
    }

    logger.info(`⏳ Connecting to MongoDB at ${new URL(config.db.uri).host}`);
    await mongoose.connect(config.db.uri, options);
    isConnected = true;
    logger.info("🍃 Database Connected!");
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(error, "😑 Failed to connect to the database");
    throw new Error("Failed to connect to the database");
  }
}

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`🚨 Received ${signal}. Shutting down gracefully...`);
    try {
      await mongoose.connection.close();
      logger.info("💤 Database connection closed due to app termination");
      throw new Error(
        `Controlled application termination by signal: ${signal}`
      );
    } catch (error) {
      logger.error(error, "Error during database close, forcing exit.");
      throw error;
    }
  });
});
