import { config } from "../config/index.js";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_COLORS = {
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m",  // Green
  warn: "\x1b[33m",  // Yellow
  error: "\x1b[31m", // Red
  reset: "\x1b[0m",
};

function formatMessage(level: LogLevel, message: string, meta?: object): string {
  const timestamp = new Date().toISOString();
  const color = LOG_COLORS[level];
  const reset = LOG_COLORS.reset;
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  
  if (config.isDev) {
    return `${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}${metaStr}`;
  }
  
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...meta,
  });
}

export const logger = {
  debug(message: string, meta?: object): void {
    if (config.isDev) {
      console.log(formatMessage("debug", message, meta));
    }
  },

  info(message: string, meta?: object): void {
    console.log(formatMessage("info", message, meta));
  },

  warn(message: string, meta?: object): void {
    console.warn(formatMessage("warn", message, meta));
  },

  error(message: string, meta?: object): void {
    console.error(formatMessage("error", message, meta));
  },
};
