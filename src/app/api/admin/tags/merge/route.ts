import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

const mergeTagsSchema = z.object({
  sourceTagId: z.string().uuid(),
  targetTagId: z.string().uuid(),
});

/**
 * POST /api/admin/tags/merge
 * 合并标签：将 sourceTag 的所有引用迁移到 targetTag，然后删除 sourceTag
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const body = await request.json();
    const validation = mergeTagsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "参数验证失败",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { sourceTagId, targetTagId } = validation.data;

    // 不能合并到自身
    if (sourceTagId === targetTagId) {
      return NextResponse.json(
        { success: false, message: "不能将标签合并到自身" },
        { status: 400 }
      );
    }

    // 检查两个标签是否存在
    const [sourceTag, targetTag] = await prisma.$transaction([
      prisma.tag.findUnique({ where: { id: sourceTagId } }),
      prisma.tag.findUnique({ where: { id: targetTagId } }),
    ]);

    if (!sourceTag) {
      return NextResponse.json(
        { success: false, message: "源标签不存在" },
        { status: 404 }
      );
    }

    if (!targetTag) {
      return NextResponse.json(
        { success: false, message: "目标标签不存在" },
        { status: 404 }
      );
    }

    // 执行合并事务
    const result = await prisma.$transaction(async (tx) => {
      // 1. 获取源标签的所有 taggings
      const sourceTaggings = await tx.tagging.findMany({
        where: { tag_id: sourceTagId },
      });

      // 2. 获取目标标签已有的 taggings（用于去重）
      const targetTaggings = await tx.tagging.findMany({
        where: { tag_id: targetTagId },
      });

      // 创建目标已有的唯一键集合
      const targetKeys = new Set(
        targetTaggings.map((t) => `${t.taggable_type}:${t.taggable_id}`)
      );

      // 3. 迁移不重复的 taggings 到目标标签
      let migratedCount = 0;
      let skippedCount = 0;

      for (const tagging of sourceTaggings) {
        const key = `${tagging.taggable_type}:${tagging.taggable_id}`;

        if (targetKeys.has(key)) {
          // 已存在，删除源 tagging
          await tx.tagging.delete({ where: { id: tagging.id } });
          skippedCount++;
        } else {
          // 不存在，迁移到目标标签
          await tx.tagging.update({
            where: { id: tagging.id },
            data: { tag_id: targetTagId },
          });
          migratedCount++;
        }
      }

      // 4. 重新计算目标标签的 usage_count
      const newUsageCount = await tx.tagging.count({
        where: { tag_id: targetTagId },
      });

      await tx.tag.update({
        where: { id: targetTagId },
        data: { usage_count: newUsageCount },
      });

      // 5. 删除源标签
      await tx.tag.delete({
        where: { id: sourceTagId },
      });

      return {
        sourceTagName: sourceTag.name,
        targetTagName: targetTag.name,
        migratedCount,
        skippedCount,
        newUsageCount,
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `成功将标签「${result.sourceTagName}」合并到「${result.targetTagName}」，迁移 ${result.migratedCount} 条引用，跳过 ${result.skippedCount} 条重复`,
    });
  } catch (error) {
    console.error("合并标签失败:", error);
    const message = error instanceof Error ? error.message : "合并标签失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
