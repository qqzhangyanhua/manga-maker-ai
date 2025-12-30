/**
 * 布局模板 API
 * GET /api/templates/layout - 获取布局模板列表
 */

import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-helpers";
import { transformLayoutTemplates } from "@/lib/layout/transform";

// GET /api/templates/layout - 获取布局模板列表
export async function GET(req: Request) {
  return withAuth(async ({ userId }) => {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const includeUser = url.searchParams.get("includeUser") === "true";

    // 构建查询条件
    const whereConditions: {
      OR?: Array<{ is_system: boolean } | { user_id: string }>;
      category?: string;
      is_system?: boolean;
    } = {};

    if (includeUser) {
      // 包含系统模板和用户自己的模板
      whereConditions.OR = [{ is_system: true }, { user_id: userId }];
    } else {
      // 只返回系统模板
      whereConditions.is_system = true;
    }

    if (category) {
      whereConditions.category = category;
    }

    const templates = await prisma.layoutTemplate.findMany({
      where: whereConditions,
      orderBy: [{ recommended: "desc" }, { use_count: "desc" }, { name: "asc" }],
    });

    // 转换为前端格式
    const transformedTemplates = transformLayoutTemplates(templates);

    return { success: true, templates: transformedTemplates };
  });
}
