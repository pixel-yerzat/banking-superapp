import express, { Application, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import config from "./config/config";
import logger from "./utils/logger";
import database from "./config/database";
import * as websocketService from "./services/websocket.service";

// Создаем приложение Express
const app: Application = express();

// Создаем HTTP сервер (для WebSocket)
const httpServer = createServer(app);

// ===============================================
// MIDDLEWARE
// ===============================================

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression
app.use(compression());

// HTTP request logger
if (config.server.env === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// ===============================================
// ROUTES
// ===============================================

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.env,
  });
});

// API версия
app.get(`/api/${config.server.apiVersion}`, (req: Request, res: Response) => {
  res.json({
    message: "Banking SuperApp API",
    version: config.server.apiVersion,
    status: "running",
  });
});

// Подключаем роуты
import authRoutes from "./routes/auth.routes";
import accountRoutes from "./routes/account.routes";
import cardRoutes from "./routes/card.routes";
import transactionRoutes from "./routes/transaction.routes";
import templateRoutes from "./routes/template.routes";
import providerRoutes from "./routes/provider.routes";
import analyticsRoutes from "./routes/analytics.routes";
import loanRoutes from "./routes/loan.routes";
import depositRoutes from "./routes/deposit.routes";
import notificationRoutes from "./routes/notification.routes";
import chatRoutes from "./routes/chat.routes";

// Auth routes
app.use(`/api/${config.server.apiVersion}/auth`, authRoutes);

// Account routes
app.use(`/api/${config.server.apiVersion}/accounts`, accountRoutes);

// Card routes
app.use(`/api/${config.server.apiVersion}/cards`, cardRoutes);

// Transaction routes
app.use(`/api/${config.server.apiVersion}/transactions`, transactionRoutes);

// Template routes (Этап 4)
app.use(`/api/${config.server.apiVersion}/templates`, templateRoutes);

// Provider routes (Этап 4)
app.use(`/api/${config.server.apiVersion}/providers`, providerRoutes);

// Analytics routes (Этап 4)
app.use(`/api/${config.server.apiVersion}/analytics`, analyticsRoutes);

// Loan routes (Этап 5)
app.use(`/api/${config.server.apiVersion}/loans`, loanRoutes);

// Deposit routes (Этап 5)
app.use(`/api/${config.server.apiVersion}/deposits`, depositRoutes);

// Notification routes (Этап 6)
app.use(`/api/${config.server.apiVersion}/notifications`, notificationRoutes);

// Chat routes (Этап 6)
app.use(`/api/${config.server.apiVersion}/chat`, chatRoutes);

// ===============================================
// ERROR HANDLING
// ===============================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.originalUrl} not found`,
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error:", err);

  res.status(500).json({
    error: "Internal Server Error",
    message:
      config.server.env === "development"
        ? err.message
        : "Something went wrong",
    ...(config.server.env === "development" && { stack: err.stack }),
  });
});

// ===============================================
// SERVER STARTUP
// ===============================================

const PORT = config.server.port;

const startServer = async () => {
  try {
    // Проверяем подключение к БД
    const dbConnected = await database.testConnection();

    if (!dbConnected) {
      logger.error("Failed to connect to database. Exiting...");
      process.exit(1);
    }

    // Инициализируем WebSocket
    websocketService.initializeWebSocket(httpServer);
    logger.info("✅ WebSocket server initialized");

    // Запускаем сервер
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running in ${config.server.env} mode`);
      logger.info(
        `🌐 API available at http://localhost:${PORT}/api/${config.server.apiVersion}`
      );
      logger.info(`🔌 WebSocket available at ws://localhost:${PORT}`);
      logger.info(`❤️  Health check at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error("Error starting server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  await database.closePool();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT signal received: closing HTTP server");
  await database.closePool();
  process.exit(0);
});

// Обработка необработанных промисов
process.on("unhandledRejection", (reason: any) => {
  logger.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Запускаем сервер
startServer();

export default app;
