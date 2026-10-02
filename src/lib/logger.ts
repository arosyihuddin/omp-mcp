import pino from "pino";
import { config } from "./config";

const isProduction = config.nodeEnv === "production";

export const logger = pino({
  level: config.logLevel,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname",
            destination: 2,
          },
        },
      }),
});
