import { officialTemplatePresets } from "@/config/template-presets";
import { prisma } from "./db";

/**
 * 确保官方模板存在：当数据库中缺少官方模板时，自动写入预置模板。
 * 设计为幂等：按名称检查，已存在的跳过。
 */
export const ensureOfficialTemplatesSeed = async () => {
  try {
  } catch (error) {
    console.error("初始化数据库失败，跳过官方模板注入:", error);
    return;
  }

  try {
    const existing = await prisma.panelTemplate.findMany({
      where: { is_official: true },
      select: { id: true, name: true },
    });

    const existingNames = new Set(existing.map((t) => t.name));
    const toCreate = officialTemplatePresets.filter((preset) => !existingNames.has(preset.name));

    if (toCreate.length === 0) return;

    for (const preset of toCreate) {
      await prisma.panelTemplate.create({
        data: {
          user_id: null,
          name: preset.name,
          description: preset.description,
          panel_count: preset.panel_count,
          template_data: JSON.stringify(preset.template_data),
          tags: preset.tags,
          is_public: true,
          is_official: true,
          thumbnail_url: preset.thumbnail_url ?? null,
        },
      });
    }
  } catch (error) {
    console.error("写入官方模板失败:", error);
  }
};
