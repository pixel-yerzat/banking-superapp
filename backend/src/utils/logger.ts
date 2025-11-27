import winston from "winston";
import config from "../config/config";
import path from "path";
import fs from "fs";

// Создаем директорию для логов если её нет
const logDir = config.logging.filePath;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Формат логов
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Формат для консоли (более читаемый)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = "";
    if (Object.keys(meta).length > 0) {
      metaStr = JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Создаем транспорты
const transports: winston.transport[] = [
  // Консоль
  new winston.transports.Console({
    format: consoleFormat,
  }),
  // Файл для всех логов
  new winston.transports.File({
    filename: path.join(logDir, "combined.log"),
    format: logFormat,
  }),
  // Файл только для ошибок
  new winston.transports.File({
    filename: path.join(logDir, "error.log"),
    level: "error",
    format: logFormat,
  }),
];

// Создаем логгер
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Для продакшн режима убираем логи в консоль
if (config.server.env === "production") {
  logger.remove(transports[0]);
}

// Экспортируем логгер
export default logger;
