import { Prisma, PrismaClient } from "@prisma/client";

const ROLLBACK_MESSAGE = "TEST_DB_ROLLBACK";

class RollbackSignal extends Error {
  constructor() {
    super(ROLLBACK_MESSAGE);
    this.name = "RollbackSignal";
  }
}

function isRollback(error: unknown): boolean {
  if (error instanceof RollbackSignal) return true;
  if (error instanceof Error && error.message === ROLLBACK_MESSAGE) return true;
  if (typeof error === "object" && error !== null && "cause" in error) {
    return isRollback(error.cause);
  }
  return false;
}

const databaseUrl = process.env.TEST_DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("数据库测试需要 TEST_DATABASE_URL");
}

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
  log: ["error"],
});

// Vitest 的 beforeEach 和测试体不共享异步上下文，所以事务客户端放在模块变量里。
// test:db 配置把 worker 限制为 1，测试按顺序跑。
let currentTx: Prisma.TransactionClient | null = null;
let releaseHold: (() => void) | null = null;
let transactionDone: Promise<void> = Promise.resolve();

export const db: Prisma.TransactionClient = new Proxy({} as Prisma.TransactionClient, {
  get(_target, property) {
    if (!currentTx) {
      throw new Error("数据库测试只能在测试事务里访问数据库");
    }
    const value: unknown = Reflect.get(currentTx, property, currentTx);
    if (typeof value === "function") {
      return value.bind(currentTx);
    }
    return value;
  },
});

export async function beginTestTransaction(): Promise<void> {
  if (currentTx) {
    throw new Error("上一个测试事务还没有结束");
  }

  let resolveReady!: (tx: Prisma.TransactionClient) => void;
  let rejectReady!: (error: unknown) => void;
  const ready = new Promise<Prisma.TransactionClient>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });

  transactionDone = prisma
    .$transaction(
      async (tx) => {
        resolveReady(tx);
        await hold;
        throw new RollbackSignal();
      },
      { maxWait: 20_000, timeout: 120_000 },
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      rejectReady(error);
      if (isRollback(error)) return;
      throw error;
    });
  void transactionDone.catch(() => undefined);

  currentTx = await ready;
  releaseHold = release;
}

export async function rollbackTestTransaction(): Promise<void> {
  const release = releaseHold;
  releaseHold = null;
  currentTx = null;
  if (!release) return;
  release();
  await transactionDone;
}

export async function disconnectTestDatabase(): Promise<void> {
  await prisma.$disconnect();
}
