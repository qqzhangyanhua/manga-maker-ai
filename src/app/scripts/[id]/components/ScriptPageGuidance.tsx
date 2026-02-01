import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Sparkles,
  ArrowUp,
  Layers,
  Image,
  Users,
  Wand2,
} from "lucide-react";
import { ActionPrompt } from "@/components/common/ActionPrompt";
import type { ScriptPageGuidanceProps } from "../types/component-props.types";

// 功能卡片数据
const FEATURE_CARDS = [
  {
    icon: BookOpen,
    title: "创建章节",
    description: "按章节组织你的故事，支持多章节管理",
    step: 1,
  },
  {
    icon: Wand2,
    title: "AI 生成分镜",
    description: "输入剧情描述，AI 自动生成分镜画面",
    step: 2,
  },
  {
    icon: Image,
    title: "图像生成",
    description: "为每个分镜生成精美的漫画图像",
    step: 3,
  },
  {
    icon: Layers,
    title: "排版导出",
    description: "自动排版并导出为可分享的漫画",
    step: 4,
  },
];

export function ScriptPageGuidance({
  progressStats,
  chapters,
  onGeneratePanelsForChapter,
  onSetCurrentChapter,
}: ScriptPageGuidanceProps) {
  return (
    <>
      {/* 空状态引导 - 完整的新手引导 */}
      {progressStats.stage === "empty" && (
        <div className="mt-8 space-y-8">
          {/* 主引导区域 */}
          <div className="bg-gradient-to-br from-[#1a1a1f] to-[#0f0f13] border border-gray-800/50 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              开始创作你的漫画剧本
            </h2>
            <p className="text-gray-400 max-w-lg mx-auto mb-6">
              从创建第一个章节开始，AI 将帮助你生成分镜画面，让创作变得简单高效
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-orange-400/80">
              <ArrowUp className="w-4 h-4 animate-bounce" />
              <span>点击右上角「创建章节」按钮开始</span>
            </div>
          </div>

          {/* 功能介绍卡片 */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              创作流程
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURE_CARDS.map((card) => (
                <div
                  key={card.step}
                  className="bg-[#1a1a1f]/60 border border-gray-800/50 rounded-xl p-5 hover:border-gray-700/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center">
                      <card.icon className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-orange-500/80">
                          步骤 {card.step}
                        </span>
                      </div>
                      <h4 className="font-medium text-white text-sm mb-1">
                        {card.title}
                      </h4>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 快捷入口提示 */}
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>支持角色管理</span>
            </div>
            <div className="w-px h-4 bg-gray-800" />
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>批量操作</span>
            </div>
            <div className="w-px h-4 bg-gray-800" />
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              <span>多种导出格式</span>
            </div>
          </div>
        </div>
      )}

      {/* 智能引导提示 - 章节已创建，等待生成分镜 */}
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
