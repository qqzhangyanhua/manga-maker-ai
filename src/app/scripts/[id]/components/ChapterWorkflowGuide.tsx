/**
 * Chapter Workflow Guide - Guide users through chapter enhancement workflow
 */

import { Info, FileText, Users, Star, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { Chapter } from "../types/script-editor.types";

interface ChapterWorkflowGuideProps {
  chapters: Chapter[];
}

export function ChapterWorkflowGuide({ chapters }: ChapterWorkflowGuideProps) {
  // Calculate statistics
  const totalChapters = chapters.length;
  const chaptersWithContent = chapters.filter(c => c.content).length;
  const keyChapters = chapters.filter(c => c.is_key_chapter).length;
  const chaptersWithStates = chapters.filter(c =>
    c.character_states && c.character_states.length > 0
  ).length;

  // Check if guide should be shown (hide if all features are used)
  const allChaptersHaveContent = totalChapters > 0 && chaptersWithContent === totalChapters;
  const hasKeyChapters = keyChapters > 0;
  const hasCharacterStates = chaptersWithStates > 0;

  // Show guide if not all features are utilized
  const shouldShowGuide = totalChapters > 0 && (!allChaptersHaveContent || !hasCharacterStates);

  if (!shouldShowGuide) {
    return (
      <Alert className="bg-green-500/10 border-green-500/30">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertTitle className="text-green-400">工作流完整</AlertTitle>
        <AlertDescription className="text-green-300/80">
          所有章节已配置完整上下文，可以开始生成高质量分镜
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-orange-500/10 border-orange-500/30">
      <Info className="h-4 w-4 text-orange-500" />
      <AlertTitle className="text-orange-400">提升故事连贯性</AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm text-zinc-400">
          使用以下功能可以让 AI 生成更连贯、更符合故事发展的分镜：
        </p>

        <div className="space-y-2">
          {/* Content generation */}
          <div className="flex items-start gap-2 text-xs">
            <FileText className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-300">生成详细内容</span>
                <Badge variant="secondary" className="text-xs">
                  {chaptersWithContent}/{totalChapters}
                </Badge>
              </div>
              <p className="text-zinc-500 mt-0.5">
                将章节梗概扩展为详细内容，提供更丰富的上下文
              </p>
            </div>
          </div>

          {/* Key chapter marking */}
          <div className="flex items-start gap-2 text-xs">
            <Star className="w-4 h-4 mt-0.5 text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-300">关键章节标记</span>
                <Badge variant="secondary" className="text-xs">
                  {keyChapters} 个关键章节
                </Badge>
                {hasKeyChapters && (
                  <Badge variant="outline" className="text-xs text-green-400 border-green-500/30">
                    已自动识别
                  </Badge>
                )}
              </div>
              <p className="text-zinc-500 mt-0.5">
                AI 已自动识别重要情节点，可手动调整
              </p>
            </div>
          </div>

          {/* Character state tracking */}
          <div className="flex items-start gap-2 text-xs">
            <Users className="w-4 h-4 mt-0.5 text-purple-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-300">角色状态追踪</span>
                <Badge variant="secondary" className="text-xs">
                  {chaptersWithStates}/{totalChapters}
                </Badge>
              </div>
              <p className="text-zinc-500 mt-0.5">
                追踪角色的位置、状态和关系变化
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
          💡 点击章节右侧菜单按钮（⋮）可使用这些功能
        </p>
      </AlertDescription>
    </Alert>
  );
}
