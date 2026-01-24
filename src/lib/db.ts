import { PrismaClient, Prisma } from "@prisma/client";
import { registerPrismaMiddleware } from "./prisma-middleware";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var dbInitialized: boolean | undefined;
}

// Re-export Prisma namespace for type conversions
export { Prisma };

const rawDatabaseUrl = process.env.DATABASE_URL;

if (!rawDatabaseUrl) {
  throw new Error("缺少 DATABASE_URL，无法连接数据库");
}

const useSSL = process.env.DATABASE_SSL === "true";

const buildDatasourceUrl = () => {
  if (!useSSL) return rawDatabaseUrl;
  try {
    const url = new URL(rawDatabaseUrl);
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    return url.toString();
  } catch {
    return rawDatabaseUrl.includes("?")
      ? `${rawDatabaseUrl}&sslmode=require`
      : `${rawDatabaseUrl}?sslmode=require`;
  }
};

const datasourceUrl = buildDatasourceUrl();

export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: datasourceUrl,
      },
    },
  });

if (!globalThis.prisma) {
  globalThis.prisma = prisma;
  // ✅ P2 修复: 注册 Prisma 中间件，自动维护项目统计
  registerPrismaMiddleware();
}

/**
 * Initialize admin user if INITIAL_ADMIN_EMAIL is set
 * This is safe to call multiple times - it only promotes the first time
 */
export const initializeAdmin = async (): Promise<void> => {
  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
  if (!initialAdminEmail) return;

  try {
    const adminCount = await prisma.user.count({
      where: { role: 'admin' }
    });

    if (adminCount === 0) {
      const user = await prisma.user.findUnique({
        where: { email: initialAdminEmail }
      });

      if (user) {
        await prisma.user.update({
          where: { email: initialAdminEmail },
          data: { role: 'admin' }
        });
        console.log(`已将 ${initialAdminEmail} 提权为管理员`);
      }
    }
  } catch (error) {
    console.error('初始化管理员失败:', error);
  }
};
