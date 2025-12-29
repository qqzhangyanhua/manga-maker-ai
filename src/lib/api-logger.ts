type LogLevel = "INFO" | "WARN" | "ERROR";

interface LogContext {
  userId?: string;
  endpoint?: string;
  method?: string;
  [key: string]: unknown;
}

function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` | ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
}

export function logInfo(message: string, context?: LogContext): void {
  console.log(formatLog("INFO", message, context));
}

export function logWarn(message: string, context?: LogContext): void {
  console.warn(formatLog("WARN", message, context));
}

export function logError(message: string, error?: unknown, context?: LogContext): void {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const fullContext = { ...context, error: errorMsg };
  console.error(formatLog("ERROR", message, fullContext));
}
