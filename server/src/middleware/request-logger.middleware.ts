import pinoHttp from "pino-http";
import { logger } from "@/utils/logger.js";

export const requestLogger = pinoHttp({
  logger,
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode ?? 0,
      };
    },
  },
});
