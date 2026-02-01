import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { z } from "zod";

// 思维链层级结构
const chainOfThoughtLevelSchema = z.object({
  level: z.string(),
  title: z.string(),
  content: z.array(z.string()),
});

const previewSchema = z.object({
  template_id: z.string().uuid().optional(),
  system_role: z.string().optional(),
  chain_of_thought: z.array(chainOfThoughtLevelSchema).optional(),
  variables: z.record(z.unknown()).optional(),
});

/**
 * POST /api/admin/prompt-templates/preview
 * 预览渲染后的提示词
 */
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const body = await request.json();
    const validation = previewSchema.safeParse(body);

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

    const { template_id, system_role, chain_of_thought, variables = {} } = validation.data;

    let finalSystemRole = system_role || "";
    let finalChainOfThought = chain_of_thought || [];

    // 如果提供了 template_id，从数据库获取模板内容
    if (template_id) {
      const template = await prisma.writingPromptTemplate.findUnique({
        where: { id: template_id },
      });

      if (!template) {
        return NextResponse.json(
          { success: false, message: "模板不存在" },
          { status: 404 }
        );
      }

      finalSystemRole = template.system_role;
      finalChainOfThought = (template.chain_of_thought as Array<{
        level: string;
        title: string;
        content: string[];
      }>) || [];
    }

    // 渲染变量替换
    const renderVariables = (text: string): string => {
      let result = text;
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        let valueStr: string;
        if (typeof value === "object" && value !== null) {
          valueStr = JSON.stringify(value, null, 2);
        } else {
          valueStr = String(value ?? "");
        }
        result = result.split(placeholder).join(valueStr);
      }
      return result;
    };

    // 渲染系统角色
    const renderedSystemRole = renderVariables(finalSystemRole);

    // 构建完整提示词
    let fullPrompt = `${renderedSystemRole}\n\n`;

    if (finalChainOfThought.length > 0) {
      fullPrompt += "## 思维链指令\n\n";
      for (const level of finalChainOfThought) {
        fullPrompt += `### ${level.title}\n`;
        for (let i = 0; i < level.content.length; i++) {
          const renderedItem = renderVariables(level.content[i]);
          fullPrompt += `${i + 1}. ${renderedItem}\n`;
        }
        fullPrompt += "\n";
      }
    }

    // 提取使用的变量
    const usedVariables = new Set<string>();
    const variablePattern = /\{\{(\w+)\}\}/g;
    let match;
    while ((match = variablePattern.exec(finalSystemRole)) !== null) {
      usedVariables.add(match[1]);
    }
    for (const level of finalChainOfThought) {
      for (const item of level.content) {
        while ((match = variablePattern.exec(item)) !== null) {
          usedVariables.add(match[1]);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        rendered_prompt: fullPrompt,
        variables_used: Array.from(usedVariables),
        character_count: fullPrompt.length,
        estimated_tokens: Math.ceil(fullPrompt.length / 4), // 粗略估算
      },
    });
  } catch (error) {
    console.error("预览模板失败:", error);
    const message = error instanceof Error ? error.message : "预览模板失败";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
