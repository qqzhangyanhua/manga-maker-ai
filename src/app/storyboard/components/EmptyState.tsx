import { FileText, Lightbulb } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-primary/10 p-6 mb-4">
        <FileText className="w-12 h-12 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">还没有分镜</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        在左侧输入你的故事剧本，或选择一个叙事模板开始创作。AI
        将自动为你拆解出专业的分镜画面。
      </p>
      <div className="flex flex-col gap-3 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>支持粘贴小说、剧本、故事大纲等任何叙事文本</span>
        </div>
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>AI 会自动分析情节节奏和镜头语言</span>
        </div>
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>生成后可进一步编辑对白和生成图像</span>
        </div>
      </div>
    </div>
  );
}
