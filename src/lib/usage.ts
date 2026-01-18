import { prisma } from "./db";

export class QuotaExceededError extends Error {
  readonly code = "QUOTA_EXCEEDED";
  readonly limit: number;
  readonly count: number;

  constructor(limit: number, count: number) {
    super(`已达到每日上限 ${limit}，请明日再试或联系管理员提升配额`);
    this.name = "QuotaExceededError";
    this.limit = limit;
    this.count = count;
  }
}

type UsageAction =
  | "storyboard_generation"
  | "story_generation"
  | "story_expansion"
  | "workflow_generation"
  | "character_setup_generation"
  | "outfit_generation"
  | "image_generation"
  | "image_edit"
  | "batch_image_generation"
  | "llm_chat"
  | "chapter_generation"
  | "panel_generation"
  | "panel_optimization"
  | "sketch_generation";

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
  image_edit: parseLimit(process.env.QUOTA_IMAGE_EDIT_DAILY, 50),
  batch_image_generation: parseLimit(process.env.QUOTA_BATCH_IMAGE_DAILY, 20),
  llm_chat: parseLimit(process.env.QUOTA_LLM_DAILY, 200),
  chapter_generation: parseLimit(process.env.QUOTA_CHAPTER_DAILY, 20),
  panel_generation: parseLimit(process.env.QUOTA_PANEL_GENERATION_DAILY, 50),
  panel_optimization: parseLimit(process.env.QUOTA_PANEL_OPTIMIZATION_DAILY, 100),
  sketch_generation: parseLimit(process.env.QUOTA_SKETCH_DAILY, 100),
};

export async function assertAndIncrementUsage(params: {
  userId: string;
  action: UsageAction;
  providerType?: string;
  amount?: number;
}) {
  const { userId, action, providerType, amount = 1 } = params;

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
    throw new QuotaExceededError(limit, currentCount);
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
  const summary: Record<UsageAction, Awaited<ReturnType<typeof getUsageSnapshot>>> = {} as Record<
    UsageAction,
    Awaited<ReturnType<typeof getUsageSnapshot>>
  >;
  for (const action of actions) {
    summary[action] = await getUsageSnapshot({ userId, action });
  }
  return summary;
}
