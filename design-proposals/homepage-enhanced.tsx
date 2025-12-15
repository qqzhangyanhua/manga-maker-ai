/**
 * 首页微调版本 - 基于现有设计的小幅改进
 *
 * 主要改进：
 * 1. 添加背景渐变装饰
 * 2. 按钮使用渐变效果
 * 3. 卡片 hover 效果增强
 * 4. 标题字号微调
 */

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { BarChart3, BookOpen, FileText, Images, Play, ArrowRight, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialDialog } from "@/components/TrialDialog";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { HeroSection, ShowcaseSection, PricingSection, Navbar } from "@/components/Landing";

const recordShortcuts = [
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

  const handleOpenTrialFromOnboarding = useCallback(() => {
    setShowTrialDialog(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] relative overflow-hidden">
      {/* 🆕 背景渐变装饰 - 增强氛围感 */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <div className="relative z-10">
        <Navbar />
      </div>

      <main className="pt-16 relative z-10">
        {/* Hero Section */}
        <HeroSection onOpenTrial={() => setShowTrialDialog(true)} />

        {/* Showcase Section */}
        <ShowcaseSection />

        {/* Try It Section */}
        <section className="px-4 py-16 bg-[#09090b]/80">
          <div className="max-w-4xl mx-auto">
            <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-8 text-center relative overflow-hidden">
              {/* 🆕 卡片内部渐变光晕 */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent pointer-events-none" />

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/10 mb-6">
                  <Play className="w-8 h-8 text-orange-500" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
                  30 秒体验 AI 漫画生成
                </h2>
                <p className="text-zinc-300 text-lg mb-6 max-w-xl mx-auto leading-relaxed">
                  不需要注册，输入一句话描述，AI 立即为你生成 4 格漫画预览。
                  <br />
                  喜欢就注册保存，继续编辑。
                </p>
                {/* 🆕 渐变按钮 */}
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white border-0 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-200"
                  onClick={() => setShowTrialDialog(true)}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  立即体验
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <div id="pricing">
          <PricingSection />
        </div>

        {/* Quick Access */}
        <section className="px-4 py-16 bg-zinc-900/30">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-10">
              <div className="space-y-2">
                <h2 className="text-4xl font-bold text-white tracking-tight">
                  快速入口
                </h2>
                <p className="text-zinc-300 text-lg leading-relaxed">
                  示例项目、剧本、分镜、漫画素材一键进入
                </p>
              </div>
              <div className="text-xs text-zinc-500 font-medium">
                需要登录后访问
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
              {recordShortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    /* 🆕 增强的 hover 效果 */
                    className="group rounded-xl border border-zinc-800/50 bg-zinc-900/40 backdrop-blur-sm hover:border-orange-500/50 hover:bg-zinc-900/60 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 p-5 flex flex-col gap-3 relative overflow-hidden"
                  >
                    {/* 🆕 卡片内部光晕 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-transparent to-transparent group-hover:from-orange-500/5 transition-all duration-500 pointer-events-none" />

                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-white group-hover:text-orange-500 transition-colors">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        {item.description}
                      </p>
                      <span className="text-sm text-orange-500 font-medium mt-2 inline-block">
                        立即进入
                        <ArrowRight className="w-4 h-4 inline ml-1 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 border-t border-zinc-800/50 bg-[#09090b]/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto text-center">
            <div className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent mb-4">
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

      {/* Dialogs */}
      <TrialDialog open={showTrialDialog} onOpenChange={setShowTrialDialog} />
      <OnboardingDialog onOpenTrialDialog={handleOpenTrialFromOnboarding} />
    </div>
  );
};

export default HomePage;
