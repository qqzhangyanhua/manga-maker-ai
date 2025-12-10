import { prisma, ensureDb } from "./db";

type UsageAction =
  | "storyboard_generation"
  | "story_generation"
  | "story_expansion"
  | "workflow_generation"
  | "character_setup_generation"
  | "outfit_generation"
  | "image_generation"
  | "batch_image_generation"
  | "llm_chat";

const parseLimit = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const DAILY_LIMITS: Record<UsageAction, number> = {
  storyboard_generation: parseLimit(process.env.QUOTA_STORYBOARD_DAILY, 20),
  story_generation: parseLimit(process.env.QUOTA_STORY_DAILY, 30),
  story_expansion: parseLimit(process.env.QUOTA_STORY_EXPANSION_DAILY, 50),
  workflow_generation: parseLimit(process.env.QUOTA_WORKFLOW_DAILY, 10),
  character_setup_generation: parseLimit(process.env.QUOTA_CHARACTER_SETUP_DAILY, 50),
  outfit_generation: parseLimit(process.env.QUOTA_OUTFIT_DAILY, 30),
  image_generation: parseLimit(process.env.QUOTA_IMAGE_DAILY, 50),
  batch_image_generation: parseLimit(process.env.QUOTA_BATCH_IMAGE_DAILY, 20),
  llm_chat: parseLimit(process.env.QUOTA_LLM_DAILY, 200),
};

export async function assertAndIncrementUsage(params: {
  userId: string;
  action: UsageAction;
  providerType?: string;
  amount?: number;
}) {
  const { userId, action, providerType, amount = 1 } = params;
  await ensureDb();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const limit = DAILY_LIMITS[action];

  const existing = await prisma.usageStat.findUnique({
    where: {
      user_id_action_date: {
        user_id: userId,
        action,
        date: today,
      },
    },
  });

  const currentCount = existing?.count ?? 0;
  const nextCount = currentCount + amount;

  if (limit && nextCount > limit) {
    const error = new Error(`已达到每日上限 ${limit}，请明日再试或联系管理员提升配额`);
    (error as any).code = "QUOTA_EXCEEDED";
    (error as any).limit = limit;
    (error as any).count = currentCount;
    throw error;
  }

  const updated = await prisma.usageStat.upsert({
    where: {
      user_id_action_date: {
        user_id: userId,
        action,
        date: today,
      },
    },
    update: {
      count: { increment: amount },
      last_used_at: new Date(),
      provider_type: providerType ?? existing?.provider_type ?? null,
    },
    create: {
      user_id: userId,
      action,
      provider_type: providerType ?? null,
      date: today,
      count: amount,
      last_used_at: new Date(),
    },
  });

  return {
    count: updated.count,
    limit,
  };
}

export async function getUsageSnapshot(params: {
  userId: string;
  action: UsageAction;
}) {
  const { userId, action } = params;
  await ensureDb();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const record = await prisma.usageStat.findUnique({
    where: {
      user_id_action_date: {
        user_id: userId,
        action,
        date: today,
      },
    },
  });

  const limit = DAILY_LIMITS[action];
  return {
    count: record?.count ?? 0,
    limit,
    remaining: limit ? Math.max(limit - (record?.count ?? 0), 0) : null,
    lastUsedAt: record?.last_used_at ?? null,
  };
}

export async function getUsageSummary(userId: string) {
  const actions: UsageAction[] = [
    "storyboard_generation",
    "story_generation",
    "workflow_generation",
    "image_generation",
    "llm_chat"
  ];
  const summary: Record<UsageAction, Awaited<ReturnType<typeof getUsageSnapshot>>> = {} as any;
  for (const action of actions) {
    summary[action] = await getUsageSnapshot({ userId, action });
  }
  return summary;
}
