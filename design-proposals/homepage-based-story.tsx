/**
 * story/page.tsx - 完全参考首页设计
 *
 * 设计元素与首页保持100%一致：
 * - 背景：bg-[#09090b]
 * - 容器卡片：bg-zinc-900/50 backdrop-blur-sm border-zinc-800 rounded-2xl
 * - 强调色：orange-500
 * - 文字：white 标题 + zinc-400 描述
 */

"use client";

import { StoryGenerator } from "@/components/Story/StoryGenerator";

export default function StoryPage() {
    return (
        <div className="min-h-screen bg-[#09090b]">
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* 标题区 - 参考首页"试用区块"的标题设计 */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">故事创作</h1>
                    <p className="text-zinc-400">
                        使用AI生成完整的故事大纲，然后转换为漫画分镜
                    </p>
                </div>

                {/* StoryGenerator 容器 - 参考首页"试用区块"的卡片设计 */}
                <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-8">
                    <StoryGenerator
                        onStoryGenerated={(story) => {
                            console.log("Story generated:", story);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
