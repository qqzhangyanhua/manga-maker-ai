import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ActionPrompt } from "@/components/common/ActionPrompt";
import type { ProgressStats } from "@/hooks/useProgressCalculation";

interface ScriptPageGuidanceProps {
  progressStats: ProgressStats;
  chapters: Array<{ id: string }>;
  nextChapterOrder: number;
  onCreateChapter: () => void;
  onGeneratePanelsForChapter: (chapterId: string) => void;
  onSetCurrentChapter: (chapterId: string) => void;
}

export function ScriptPageGuidance({
  progressStats,
  chapters,
  nextChapterOrder,
  onCreateChapter,
  onGeneratePanelsForChapter,
  onSetCurrentChapter,
}: ScriptPageGuidanceProps) {
  return (
    <>
      {/* 空状态引导 */}
      {progressStats.stage === "empty" && (
        <div className="mt-8">
          <EmptyState
            icon={<BookOpen className="w-full h-full" />}
            title="开始创作你的漫画剧本"
            description="创建第一个章节，然后生成分镜画面,开始你的漫画创作之旅"
            action={
              <Button
                onClick={onCreateChapter}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                创建第一个章节
              </Button>
            }
          />
        </div>
      )}

      {/* 智能引导提示 */}
      {progressStats.stage === "chapter_created" && (
        <div className="mt-6 mb-6">
          <ActionPrompt
            icon={<Sparkles className="w-full h-full" />}
            message='章节已就绪！点击"生成分镜"让 AI 为你创作精彩画面'
            variant="success"
            action={
              <Button
                onClick={() => {
                  if (chapters && chapters.length > 0) {
                    onSetCurrentChapter(chapters[0].id);
                    onGeneratePanelsForChapter(chapters[0].id);
                  }
                }}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                开始生成分镜
              </Button>
            }
          />
        </div>
      )}
    </>
  );
}
