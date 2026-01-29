/**
 * 导入写作提示词模板脚本
 * 从 study 目录解析 md 文件并导入到数据库
 *
 * 用法: npx tsx scripts/import-writing-templates.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// 阶段映射规则
const PHASE_MAPPING: Record<string, string> = {
  "10-创意阶段": "creative",
  "20-设定阶段": "setting",
  "30-框架阶段": "framework",
  "40-创作阶段": "writing",
  "50-进阶技巧": "advanced",
  "60-数据分析": "analysis",
  "70-商业化": "commercial",
  "80-辅助工具": "auxiliary",
  "90-额外功能": "extra",
};

// 子分类映射规则（根据文件名关键词）
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  inspiration: ["灵感", "创意"],
  market: ["市场", "定位", "扫榜"],
  positioning: ["卖点", "立项"],
  world: ["世界观", "等级体系"],
  character: ["人物", "角色", "主角", "配角", "女主", "反派"],
  power_system: ["金手指"],
  outline: ["大纲", "框架"],
  chapter_outline: ["章级", "章节纲", "细纲", "场景纲"],
  golden_three: ["黄金三章"],
  book_info: ["书名", "简介"],
  chapter: ["章节创作"],
  revision: ["修订", "润色", "检查"],
  style: ["风格", "语言", "文风"],
  description: ["描述", "场景卡", "感官"],
  dialogue: ["对话", "潜台词"],
  cool_points: ["爽点"],
  pacing: ["节奏"],
  combat: ["战斗"],
  daily: ["日常"],
  suspense: ["悬疑", "伏笔"],
  multi_ending: ["多结局"],
  quality: ["质量", "评分", "审校"],
  feedback: ["反馈", "读者"],
  marketing: ["营销", "宣传", "文案"],
  promotion: ["粉丝", "运营", "热度", "算法"],
  tools: ["灵感捕捉", "卡文", "拆解", "拆书"],
  analysis_extra: ["用户画像", "复盘", "准备清单", "素材收集", "人物弧线"],
};

// 专题目录映射
const GENRE_DIRS = ["多子多福", "替身文", "欲念描写专家", "黑暗多子多福"];

// 解析后的模板结构
interface ParsedTemplate {
  code: string;
  name: string;
  description: string | null;
  phase: string;
  category: string;
  genre: string | null;
  systemRole: string;
  chainOfThought: ChainLevel[];
  outputSchema: Record<string, unknown> | null;
  inputSlots: SlotDef[];
  outputSlots: SlotDef[];
}

interface ChainLevel {
  level: string;
  title: string;
  content: string[];
}

interface SlotDef {
  name: string;
  displayName: string;
  description: string | null;
  required: boolean;
}

/**
 * 从文件名中提取阶段关键词映射
 * 用于专题模板（如狗血女文-创意阶段-xxx）
 */
const PHASE_KEYWORDS: Record<string, string> = {
  "创意阶段": "creative",
  "设定阶段": "setting",
  "框架阶段": "framework",
  "创作阶段": "writing",
  "进阶技巧": "advanced",
  "数据分析": "analysis",
  "商业化": "commercial",
  "辅助工具": "auxiliary",
  "额外功能": "extra",
};

/**
 * 从目录路径或文件名提取 phase
 * 1. 首先检查目录路径（如 10-创意阶段）
 * 2. 如果未匹配，检查文件名中的阶段关键词（如 狗血女文-创意阶段-xxx）
 */
function extractPhase(dirPath: string, fileName: string = ""): string {
  // 优先从目录路径匹配
  for (const [dirName, phase] of Object.entries(PHASE_MAPPING)) {
    if (dirPath.includes(dirName)) {
      return phase;
    }
  }
  
  // 从文件名匹配阶段关键词
  for (const [keyword, phase] of Object.entries(PHASE_KEYWORDS)) {
    if (fileName.includes(keyword)) {
      return phase;
    }
  }
  
  return "other";
}

/**
 * 从文件名提取 category
 */
function extractCategory(fileName: string): string {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (fileName.includes(keyword)) {
        return category;
      }
    }
  }
  return "general";
}

/**
 * 从目录路径提取 genre（专题）
 */
function extractGenre(dirPath: string): string | null {
  for (const genre of GENRE_DIRS) {
    if (dirPath.includes(genre)) {
      return genre;
    }
  }
  // 检查专门题材目录
  if (dirPath.includes("专门题材")) {
    const match = dirPath.match(/专门题材[\\/]([^\\/]+)/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

/**
 * 解析 md 文件内容
 */
function parseMdFile(filePath: string): ParsedTemplate | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const fileName = path.basename(filePath, ".md");
    const dirPath = path.dirname(filePath);

    // 提取标题（第一行 # 开头）
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : fileName;

    // 提取系统角色
    const systemRoleMatch = content.match(
      /##\s*系统角色\s*\n([\s\S]*?)(?=\n##\s|\n#\s|$)/
    );
    const systemRole = systemRoleMatch
      ? systemRoleMatch[1].trim()
      : "";

    if (!systemRole) {
      console.warn(`[WARN] 跳过无系统角色的文件: ${filePath}`);
      return null;
    }

    // 提取思维链指令
    const chainMatch = content.match(
      /##\s*思维链指令\s*\n([\s\S]*?)(?=\n##\s(?!#)|$)/
    );
    const chainContent = chainMatch ? chainMatch[1] : "";
    const chainOfThought = parseChainOfThought(chainContent);

    // 提取输出要求（JSON Schema）
    const outputMatch = content.match(
      /##\s*输出要求\s*\n([\s\S]*?)(?=\n##\s(?!#)|$)/
    );
    const outputContent = outputMatch ? outputMatch[1] : "";
    const outputSchema = extractJsonSchema(outputContent);

    // 提取输入插槽
    const inputMatch = content.match(
      /##\s*输入插槽\s*\n([\s\S]*?)(?=\n##\s(?!#)|$)/
    );
    const inputContent = inputMatch ? inputMatch[1] : "";
    const inputSlots = parseSlots(inputContent);

    // 提取输出插槽
    const outputSlotMatch = content.match(
      /##\s*输出插槽\s*\n([\s\S]*?)(?=\n##\s(?!#)|$)/
    );
    const outputSlotContent = outputSlotMatch ? outputSlotMatch[1] : "";
    const outputSlots = parseSlots(outputSlotContent);

    // 提取描述（从系统角色的第一段）
    const descriptionLines = systemRole.split("\n").filter((l) => l.trim());
    const description =
      descriptionLines.length > 0
        ? descriptionLines[0].replace(/^你是.+?[，,。.]/, "").trim()
        : null;

    // 提取模板名称（用于 phase 匹配）
    const templateName = title.replace(/^[\d-]+/, "").trim() || fileName;
    
    return {
      code: fileName,
      name: templateName,
      description: description && description.length > 10 ? description : null,
      phase: extractPhase(dirPath, templateName),
      category: extractCategory(fileName),
      genre: extractGenre(dirPath),
      systemRole,
      chainOfThought,
      outputSchema,
      inputSlots,
      outputSlots,
    };
  } catch (error) {
    console.error(`[ERROR] 解析文件失败: ${filePath}`, error);
    return null;
  }
}

/**
 * 解析思维链指令
 */
function parseChainOfThought(content: string): ChainLevel[] {
  const levels: ChainLevel[] = [];
  // 匹配 ### 第X层/步 格式
  const levelRegex =
    /###\s*(第[零一二三四五六七八九十百]+[层步](?:思考)?[：:]?\s*[^\n]*)\n([\s\S]*?)(?=\n###\s|$)/g;

  let match;
  while ((match = levelRegex.exec(content)) !== null) {
    const levelTitle = match[1].trim();
    const levelContent = match[2].trim();

    // 提取层级名称
    const levelNameMatch = levelTitle.match(/第([零一二三四五六七八九十百]+)[层步]/);
    const levelName = levelNameMatch ? `第${levelNameMatch[1]}层` : levelTitle;

    // 解析内容为列表项
    const items: string[] = [];
    const lines = levelContent.split("\n");
    let currentItem = "";

    for (const line of lines) {
      const trimmed = line.trim();
      // 匹配列表项开头（数字. 或 -）
      if (/^(\d+\.|-)/.test(trimmed)) {
        if (currentItem) {
          items.push(currentItem.trim());
        }
        currentItem = trimmed.replace(/^(\d+\.|-)/, "").trim();
      } else if (trimmed && currentItem) {
        currentItem += " " + trimmed;
      }
    }
    if (currentItem) {
      items.push(currentItem.trim());
    }

    levels.push({
      level: levelName,
      title: levelTitle,
      content: items.length > 0 ? items : [levelContent],
    });
  }

  // 如果没有匹配到层级格式，把整个内容作为一个层级
  if (levels.length === 0 && content.trim()) {
    levels.push({
      level: "main",
      title: "主要指令",
      content: [content.trim()],
    });
  }

  return levels;
}

/**
 * 从输出要求中提取 JSON Schema
 */
function extractJsonSchema(content: string): Record<string, unknown> | null {
  // 匹配 ```json ... ``` 代码块
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) {
    return null;
  }

  try {
    const jsonStr = jsonMatch[1].trim();
    return JSON.parse(jsonStr);
  } catch {
    // JSON 解析失败，可能是示例而非严格 JSON
    // 返回原始文本作为 schema 描述
    return { _raw: jsonMatch[1].trim() };
  }
}

/**
 * 解析插槽定义
 */
function parseSlots(content: string): SlotDef[] {
  const slots: SlotDef[] = [];

  // 匹配列表格式: - {{name}}：说明
  const listRegex = /-\s*\{\{(\w+)\}\}[：:]\s*(.+?)(?:\(([^)]+)\))?$/gm;
  let match;
  while ((match = listRegex.exec(content)) !== null) {
    const name = match[1];
    const desc = match[2].trim();
    const optional = match[3]?.includes("可选") || false;

    slots.push({
      name,
      displayName: desc.split(/[,，。]/)[0].trim(),
      description: desc,
      required: !optional,
    });
  }

  // 匹配表格格式: | {{name}} | ✅/⬜ | 说明 |
  const tableRegex =
    /\|\s*\{\{(\w+)\}\}\s*\|\s*([✅⬜])\s*\|\s*(.+?)\s*\|/g;
  while ((match = tableRegex.exec(content)) !== null) {
    const name = match[1];
    const required = match[2] === "✅";
    const desc = match[3].trim();

    slots.push({
      name,
      displayName: desc.split(/[,，。]/)[0].trim(),
      description: desc,
      required,
    });
  }

  return slots;
}

/**
 * 递归遍历目录获取所有 md 文件
 */
function getAllMdFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    console.warn(`[WARN] 目录不存在: ${dir}`);
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // 跳过 .claude 等隐藏目录
      if (!entry.name.startsWith(".")) {
        files.push(...getAllMdFiles(fullPath));
      }
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      // 跳过 README.md
      if (entry.name.toLowerCase() !== "readme.md") {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * 导入模板到数据库
 */
async function importTemplate(template: ParsedTemplate): Promise<boolean> {
  try {
    // 创建或更新模板
    const dbTemplate = await prisma.writingPromptTemplate.upsert({
      where: { code: template.code },
      create: {
        code: template.code,
        name: template.name,
        description: template.description,
        phase: template.phase,
        category: template.category,
        genre: template.genre,
        system_role: template.systemRole,
        chain_of_thought: template.chainOfThought,
        output_schema: template.outputSchema,
        sort_order: extractSortOrder(template.code),
      },
      update: {
        name: template.name,
        description: template.description,
        phase: template.phase,
        category: template.category,
        genre: template.genre,
        system_role: template.systemRole,
        chain_of_thought: template.chainOfThought,
        output_schema: template.outputSchema,
        sort_order: extractSortOrder(template.code),
        updated_at: new Date(),
      },
    });

    // 删除旧的插槽
    await prisma.templateSlot.deleteMany({
      where: { template_id: dbTemplate.id },
    });

    // 创建输入插槽
    for (const slot of template.inputSlots) {
      await prisma.templateSlot.create({
        data: {
          template_id: dbTemplate.id,
          name: slot.name,
          display_name: slot.displayName,
          description: slot.description,
          slot_type: "input",
          data_type: "text",
          required: slot.required,
        },
      });
    }

    // 创建输出插槽
    for (const slot of template.outputSlots) {
      await prisma.templateSlot.create({
        data: {
          template_id: dbTemplate.id,
          name: slot.name,
          display_name: slot.displayName,
          description: slot.description,
          slot_type: "output",
          data_type: "json",
          required: false,
        },
      });
    }

    return true;
  } catch (error) {
    console.error(`[ERROR] 导入模板失败: ${template.code}`, error);
    return false;
  }
}

/**
 * 从文件名提取排序号
 */
function extractSortOrder(code: string): number {
  const match = code.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 999;
}

/**
 * 主函数
 */
async function main() {
  console.log("========================================");
  console.log("  写作提示词模板导入工具");
  console.log("========================================\n");

  const studyDir = path.join(process.cwd(), "study");

  // 定义要扫描的目录
  const scanDirs = [
    path.join(studyDir, "tsc-整理后"),
    path.join(studyDir, "tsc2-整理后"),
  ];

  let totalFiles = 0;
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const dir of scanDirs) {
    console.log(`\n扫描目录: ${dir}`);

    const mdFiles = getAllMdFiles(dir);
    console.log(`找到 ${mdFiles.length} 个 md 文件\n`);
    totalFiles += mdFiles.length;

    for (const filePath of mdFiles) {
      const relativePath = path.relative(studyDir, filePath);
      process.stdout.write(`处理: ${relativePath}... `);

      const template = parseMdFile(filePath);

      if (!template) {
        console.log("跳过（无有效内容）");
        skipCount++;
        continue;
      }

      const success = await importTemplate(template);

      if (success) {
        console.log("✓");
        successCount++;
      } else {
        console.log("✗");
        errorCount++;
      }
    }
  }

  console.log("\n========================================");
  console.log("  导入完成");
  console.log("========================================");
  console.log(`总文件数: ${totalFiles}`);
  console.log(`成功导入: ${successCount}`);
  console.log(`跳过: ${skipCount}`);
  console.log(`失败: ${errorCount}`);

  // 统计数据库中的模板数量
  const dbCount = await prisma.writingPromptTemplate.count();
  console.log(`\n数据库中模板总数: ${dbCount}`);

  // 按阶段统计
  const phaseStats = await prisma.writingPromptTemplate.groupBy({
    by: ["phase"],
    _count: true,
  });
  console.log("\n按阶段统计:");
  for (const stat of phaseStats) {
    console.log(`  ${stat.phase}: ${stat._count}`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("导入失败:", error);
  prisma.$disconnect();
  process.exit(1);
});
