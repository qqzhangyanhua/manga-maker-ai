/** 显式设为 true 才算开启。false、空字符串和其他值都保持关闭。 */
export const SIMULATE_PAY_ENV = "ALLOW_SIMULATE_PAYMENT";

/**
 * 模拟支付只在非生产环境、并且开关被显式打开时存在。
 * 生产环境即使打开开关也视为接口不存在。
 */
export function isSimulatePayEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production" && env[SIMULATE_PAY_ENV] === "true";
}
