/**
 * 统一日志系统 - Winston Logger
 *
 * 使用说明：
 * import { logger } from "@/lib/logger";
 *
 * logger.info("User logged in", { userId: "123" });
 * logger.error("Failed to process", { error: err });
 * logger.debug("Debug info", { data });
 *
 * 日志级别（从高到低）:
 * - error: 错误信息
 * - warn: 警告信息
 * - info: 一般信息
 * - http: HTTP 请求日志
 * - debug: 调试信息
 */

import winston from "winston";

// 环境变量配置
const env = process.env.NODE_ENV || "development";
const logLevel = process.env.LOG_LEVEL || (env === "production" ? "info" : "debug");

/**
 * 自定义格式：添加时间戳和颜色
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * 开发环境格式：更易读
 */
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : "";
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

/**
 * 创建 Winston Logger
 */
export const logger = winston.createLogger({
  level: logLevel,
  format: env === "production" ? customFormat : devFormat,
  defaultMeta: {
    service: "manga-maker-ai",
    environment: env,
  },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      stderrLevels: ["error"],
    }),

    // 生产环境：错误日志写入文件
    ...(env === "production"
      ? [
          new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: "logs/combined.log",
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
        ]
      : []),
  ],
  // 处理未捕获的异常和拒绝
  exceptionHandlers: [
    new winston.transports.Console(),
    ...(env === "production"
      ? [new winston.transports.File({ filename: "logs/exceptions.log" })]
      : []),
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
    ...(env === "production"
      ? [new winston.transports.File({ filename: "logs/rejections.log" })]
      : []),
  ],
});

/**
 * HTTP 请求日志中间件（用于 API 路由）
 */
export interface RequestLogData {
  method: string;
  url: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  status?: number;
}

export function logRequest(data: RequestLogData): void {
  const { method, url, duration, status, ...meta } = data;
  const message = `${method} ${url}${status ? ` - ${status}` : ""}${duration ? ` (${duration}ms)` : ""}`;

  if (status && status >= 500) {
    logger.error(message, meta);
  } else if (status && status >= 400) {
    logger.warn(message, meta);
  } else {
    logger.http(message, meta);
  }
}

/**
 * 数据库操作日志
 */
export interface DbLogData {
  operation: string; // SELECT, INSERT, UPDATE, DELETE
  table: string;
  duration?: number;
  rowCount?: number;
  [key: string]: unknown;
}

export function logDb(data: DbLogData): void {
  const { operation, table, duration, rowCount, ...meta } = data;
  const message = `DB ${operation} ${table}${rowCount ? ` (${rowCount} rows)` : ""}${duration ? ` - ${duration}ms` : ""}`;

  if (duration && duration > 1000) {
    logger.warn(`Slow query: ${message}`, meta);
  } else {
    logger.debug(message, meta);
  }
}

/**
 * 业务日志辅助函数
 */
export const businessLogger = {
  /**
   * 用户操作日志
   */
  userAction(action: string, userId: string, meta?: Record<string, unknown>): void {
    logger.info(`User action: ${action}`, { userId, ...meta });
  },

  /**
   * 算力操作日志
   */
  credits(action: string, userId: string, amount: number, meta?: Record<string, unknown>): void {
    logger.info(`Credits ${action}`, { userId, amount, ...meta });
  },

  /**
   * AI 生成日志
   */
  aiGeneration(type: string, userId: string, meta?: Record<string, unknown>): void {
    logger.info(`AI generation: ${type}`, { userId, ...meta });
  },

  /**
   * 安全相关日志
   */
  security(event: string, meta?: Record<string, unknown>): void {
    logger.warn(`Security: ${event}`, meta);
  },
};

/**
 * 开发环境：输出日志配置信息
 */
if (env === "development") {
  logger.info("Logger initialized", {
    level: logLevel,
    environment: env,
  });
}

export default logger;
