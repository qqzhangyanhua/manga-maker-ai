import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var dbInitialized: boolean | undefined;
}

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
}

let initialized = globalThis.dbInitialized || false;

const bootstrapSql = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 兼容旧表，确保新增字段存在
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ALTER COLUMN password_hash SET DEFAULT '';
ALTER TABLE users ALTER COLUMN verified SET DEFAULT FALSE;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active';
UPDATE users SET password_hash = '' WHERE password_hash IS NULL;
UPDATE users SET verified = FALSE WHERE verified IS NULL;
UPDATE users SET role = 'user' WHERE role IS NULL;
UPDATE users SET status = 'active' WHERE status IS NULL;
UPDATE users SET role = 'admin' WHERE email = 'yanz57213@gmail.com';

CREATE TABLE IF NOT EXISTS email_verifications (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT FALSE;
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS code_hash TEXT;
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);

-- 模型提供方配置，用于按 type 查找调用参数
CREATE TABLE IF NOT EXISTS llm_providers (
  id SERIAL PRIMARY KEY,
  provider_type TEXT NOT NULL,
  provider_name TEXT DEFAULT 'openai',
  model TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT DEFAULT '' NOT NULL,
  priority INT DEFAULT 1,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE llm_providers ADD COLUMN IF NOT EXISTS provider_name TEXT DEFAULT 'openai';
ALTER TABLE llm_providers ADD COLUMN IF NOT EXISTS api_key TEXT DEFAULT '' NOT NULL;
ALTER TABLE llm_providers ADD COLUMN IF NOT EXISTS priority INT DEFAULT 1;
ALTER TABLE llm_providers ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE llm_providers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE llm_providers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_llm_providers_type_enabled ON llm_providers(provider_type, enabled, priority);
`;

export const ensureDb = async () => {
  if (initialized) return;
  await prisma.$executeRawUnsafe(bootstrapSql);
  initialized = true;
  globalThis.dbInitialized = true;
};
