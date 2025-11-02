import pino from "pino";
import { config } from "./config.js";

const targets = [];
if (config.isDev) {
  targets.push({
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:dd-mm-yyyy HH:MM:ss",
      ignore: "pid,hostname",
    },
  });
}

// targets.push({
//   target: 'pino/file',
//   options: { destination: '../../logs/output.logs', mkdir: true, colorize: false },
// });

const transport = pino.transport({ targets });

export const logger = pino(
  {
    level: config.logLevel,
    redact: {
      paths: [
        "email",
        "password",
        "password_hash",
        "refresh_token",
        "access_token",
      ],
      remove: true,
    },
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
  },
  transport
);
