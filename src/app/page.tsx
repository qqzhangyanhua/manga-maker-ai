"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, BookOpen, FileText, Images, Play, ArrowRight, Layers, Sparkles, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialDialog } from "@/components/TrialDialog";
import { HeroSection, ShowcaseSection, Navbar } from "@/components/Landing";

const recordShortcuts = [
  {
    title: "生成小说",
    description: "使用 AI 辅助创作，让灵感变成精彩小说",
    href: "/novel",
    icon: PenLine,
  },
  {
    title: "示例项目",
    description: "浏览优质示例，一键复制到你的账号开始学习",
    href: "/samples",
    icon: Layers,
  },
  {
    title: "剧本记录",
    description: "查看所有生成的故事与剧本，继续修改或派生分镜",
    href: "/scripts",
    icon: FileText,
  },
  {
    title: "分镜项目",
    description: "查看所有分镜项目，进入编辑器继续修改",
    href: "/projects",
    icon: BookOpen,
  },
  {
    title: "生成图库",
    description: "按时间回溯所有生成图片，支持筛选与收藏",
    href: "/generated",
    icon: Images,
  },
  {
    title: "用量与日志",
    description: "管理员可在此审计生成日志与配额消耗",
    href: "/admin/usage",
    icon: BarChart3,
  },
];

const HomePage = () => {
  const [showTrialDialog, setShowTrialDialog] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      {/* Navbar */}
      <Navbar />

      <main className="pt-16">
        {/* Hero Section with futuristic manga studio style */}
        <HeroSection onOpenTrial={() => setShowTrialDialog(true)} />

        {/* Showcase Section - Production Logs */}
        <ShowcaseSection />

        {/* Try It Section */}
        <section className="px-4 py-16 bg-gradient-to-b from-[#0f0f13] to-[#0d0d12]">
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-zinc-900/60 backdrop-blur-md border border-zinc-700 rounded-2xl p-8 text-center shadow-2xl shadow-orange-500/5 overflow-hidden">
              {/* 顶部高光 */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
              {/* 内部光晕 */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-orange-500/5 blur-3xl rounded-full" />

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/10 mb-6 ring-2 ring-orange-500/30 shadow-lg shadow-orange-500/20">
                <Play className="w-8 h-8 text-orange-500" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                30 秒体验 AI 漫画生成
              </h2>
              <p className="text-zinc-300 mb-6 max-w-xl mx-auto">
                不需要注册，输入一句话描述，AI 立即为你生成 4 格漫画预览。
                <br />
                喜欢就注册保存，继续编辑。
              </p>
              <Button
                size="lg"
                className="relative bg-orange-500 hover:bg-orange-600 text-white border-0 overflow-hidden group"
                onClick={() => setShowTrialDialog(true)}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <Sparkles className="w-5 h-5 mr-2 relative z-10" />
                <span className="relative z-10">立即体验</span>
                <ArrowRight className="w-4 h-4 ml-2 relative z-10" />
              </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Access */}
        <section className="px-4 py-16 bg-gradient-to-b from-zinc-900/30 to-zinc-900/50">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white">
                  快速入口
                </h2>
                <p className="text-zinc-300">
                  示例项目、剧本、分镜、漫画素材一键进入
                </p>
              </div>
              <div className="text-xs text-zinc-500">
                需要登录后访问
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recordShortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group relative rounded-xl border border-zinc-700 bg-zinc-900/60 backdrop-blur-md hover:border-orange-500/50 hover:bg-zinc-900/80 transition-all duration-300 p-4 flex flex-col gap-3 shadow-lg hover:shadow-xl hover:shadow-orange-500/10 overflow-hidden hover:-translate-y-1"
                  >
                    {/* 顶部高光 */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {/* Hover时的内部光晕 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-500/0 group-hover:from-orange-500/5 group-hover:to-transparent transition-all duration-300" />
                    <div className="flex items-center gap-2 relative z-10">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/10 text-orange-500 flex items-center justify-center ring-1 ring-orange-500/30 group-hover:ring-orange-500/50 group-hover:shadow-lg group-hover:shadow-orange-500/20 transition-all">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-white group-hover:text-orange-500 transition-colors">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {item.description}
                    </p>
                    <span className="text-sm text-orange-500 font-medium">
                      立即进入
                      <ArrowRight className="w-4 h-4 inline ml-1" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative py-12 px-4 border-t border-zinc-800 bg-gradient-to-b from-[#0d0d12] to-[#0f0f13] overflow-hidden">
          {/* 装饰性光晕 */}
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-orange-500/5 blur-3xl rounded-full -translate-y-1/2" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/3 blur-3xl rounded-full translate-y-1/2" />

          <div className="max-w-7xl mx-auto text-center relative z-10">
            <div className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 bg-clip-text text-transparent mb-4">
              ComicAI
            </div>
            <p className="text-zinc-400 text-sm">
              用 AI 释放你的创意，创造属于你的漫画世界
            </p>
            <p className="text-zinc-600 text-xs mt-4">
              &copy; 2024 ComicAI. All rights reserved.
            </p>
          </div>
        </footer>
      </main>

      {/* Trial Dialog */}
      <TrialDialog open={showTrialDialog} onOpenChange={setShowTrialDialog} />
    </div>
  );
};

export default HomePage;
