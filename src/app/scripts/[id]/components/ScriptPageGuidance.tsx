import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Sparkles,
  ArrowUp,
  Layers,
  Image as ImageIcon,
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
    icon: ImageIcon,
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
  onBatchGenerateImages,
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
              <ImageIcon className="w-4 h-4" />
              <span>多种导出格式</span>
            </div>
          </div>
        </div>
      )}

      {/* ✅ 智能引导提示 - 章节已创建，等待生成分镜 */}
      {progressStats.stage === "chapter_created" && (
        <div className="mt-6 mb-6">
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  章节已创建，开始生成分镜吧！
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  您已创建 {chapters.length} 个章节，现在可以使用 AI 自动生成分镜画面。
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => {
                      if (chapters && chapters.length > 0) {
                        onSetCurrentChapter(chapters[0].id);
                        onGeneratePanelsForChapter(chapters[0].id);
                      }
                    }}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/20"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    生成第 1 章分镜
                  </Button>
                  {chapters.length > 1 && (
                    <span className="text-xs text-gray-500">
                      或点击右上角「批量生成分镜」一次生成所有章节
                    </span>
                  )}
                </div>

                {/* 生成步骤说明 */}
                <div className="mt-4 pt-4 border-t border-green-500/10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-semibold">
                        1
                      </div>
                      <div>
                        <div className="font-medium text-gray-300">AI 分析剧情</div>
                        <div className="text-gray-500">理解章节内容和情节</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-semibold">
                        2
                      </div>
                      <div>
                        <div className="font-medium text-gray-300">生成分镜脚本</div>
                        <div className="text-gray-500">自动创建分镜描述</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-semibold">
                        3
                      </div>
                      <div>
                        <div className="font-medium text-gray-300">等待图片生成</div>
                        <div className="text-gray-500">稍后生成精美图片</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ 新增：分镜已生成，等待生成图片 */}
      {progressStats.stage === "generating" && progressStats.pendingPanels > 0 && (
        <div className="mt-6 mb-6">
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  分镜脚本已就绪，生成图片吧！
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  您有 <span className="text-blue-400 font-semibold">{progressStats.pendingPanels}</span> 个分镜等待生成图片，
                  预计需要 <span className="text-blue-400 font-semibold">{progressStats.estimatedMinutes}</span> 分钟。
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={onBatchGenerateImages}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/20"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    开始生成图片
                  </Button>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>已完成 {progressStats.completedPanels}/{progressStats.totalPanels}</span>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="text-gray-400">整体进度</span>
                    <span className="text-blue-400 font-semibold">{progressStats.completionRate}%</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${progressStats.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
