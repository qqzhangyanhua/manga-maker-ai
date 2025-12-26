const fs = require('fs');

const fixes = [
  // page.tsx fixes
  {
    file: 'src/app/scripts/[id]/page.tsx',
    replacements: [
      { line: 105, content: '      { successMessage: "剧本已保存" }' },
      { line: 125, content: '      { successMessage: "分镜已删除" }' },
      { line: 135, content: '      { successMessage: "角色已添加到故事" }' },
      { line: 145, content: '      { successMessage: "角色已从故事移除" }' },
      { line: 155, content: '      { successMessage: "角色类型已更新" }' },
      { line: 162, content: '      toast({ title: "故事不存在", variant: "destructive" });' },
      { line: 121, content: '          throw new Error(data.error || "删除分镜失败");' },
      { line: 189, content: '            description: data.story.premise || "AI生成的漫画项目",' },
      { line: 197, content: '          throw new Error(error.error || "创建项目失败");' },
      { line: 216, content: '          ? "AI 已成功重新生成分镜脚本"' },
      { line: 217, content: '          : "AI 已成功追加新的分镜脚本",' },
      { line: 243, content: '            <h1 className="text-2xl font-bold text-white mb-4">未找到剧本</h1>' },
      { line: 111, content: '    toast({ title: "图片生成成功" });' },
      { line: 325, content: '          toast({ title: "错误", description: msg, variant: "destructive" })' },
    ]
  },
  // SerialChapterList.tsx fixes
  {
    file: 'src/components/SerialChapterList.tsx',
    replacements: [
      { line: 195, content: '        title: currentStatus === "published" ? "已取消发布" : "发布成功",' },
      { line: 155, content: '        title: "无法发布",' },
      { line: 156, content: '        description: "章节还没有生成分镜，请先生成分镜",' },
      { line: 191, content: '        throw new Error(data.error || "操作失败");' },
      { line: 204, content: '        description: error instanceof Error ? error.message : "未知错误",' },
      { line: 239, content: '        title: "没有可生成的章节",' },
      { line: 240, content: '        description: "所选章节都已有分镜",' },
      { line: 248, content: '      description: `正在为 ${chaptersToGenerate.length} 个章节生成分镜..`,' },
      { line: 275, content: '        title: "没有可发布的章节",' },
      { line: 276, content: '        description: "所选章节都已发布或不符合发布条件",' },
      { line: 297, content: '      description: `成功发布 ${chaptersToPublish.length} 个章节`,' },
      { line: 328, content: '                已发布 {publishedCount} 章 · 草稿 {draftCount} 章' },
      { line: 329, content: '                {isBatchMode && <> · 已选 {selectedChapters.size} 章</>}' },
      { line: 400, content: '              <p className="mb-4">还没有章节</p>' },
      { line: 403, content: '                创建第一章' },
      { line: 417, content: '                    {isBatchMode ? <>已选 {selectedChapters.size} 章</> : "全选"}' },
      { line: 422, content: '                      提示：勾选章节可批量操作' },
      { line: 594, content: '              该章节存在以下问题，确定要发布吗？' },
    ]
  }
];

fixes.forEach(({ file, replacements }) => {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    replacements.forEach(({ line, content: newContent }) => {
      lines[line - 1] = newContent;
    });

    fs.writeFileSync(file, lines.join('\n'), 'utf-8');
    console.log(`✓ Fixed: ${file}`);
  } catch (error) {
    console.error(`✗ Error fixing ${file}:`, error.message);
  }
});

console.log('\nAll encoding fixes complete!');
