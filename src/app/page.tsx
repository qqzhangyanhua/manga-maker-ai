"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { BarChart3, BookOpen, FileText, Images, Sparkles, Zap, Play, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { WorkflowGuide } from "@/components/WorkflowGuide";
import { TrialDialog } from "@/components/TrialDialog";
import { OnboardingDialog } from "@/components/OnboardingDialog";

const recordShortcuts = [
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

  // 回调函数：从 OnboardingDialog 打开 TrialDialog
  const handleOpenTrialFromOnboarding = useCallback(() => {
    setShowTrialDialog(true);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden pt-16">
          {/* Background Effects */}
          <div className="absolute inset-0 halftone-pattern opacity-30" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
          <div className="absolute inset-0 action-lines" />

          <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8 animate-slide-in">
              <Zap className="w-4 h-4 text-secondary" />
              <span className="text-sm font-semibold text-foreground">
                AI 驱动的漫画创作平台
              </span>
            </div>

            {/* Main Title */}
            <h1 className="font-comic text-5xl md:text-7xl mb-6 animate-slide-in-delay-1">
              <span className="comic-title">用 AI 创造</span>
              <br />
              <span className="text-foreground">你的专属漫画</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-in-delay-2">
              从故事构思到分镜生成，4 步完成你的漫画创作
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-in-delay-3">
              <Button variant="comic" size="xl" asChild>
                <Link href="/story">
                  <Sparkles className="w-5 h-5" />
                  立即开始创作
                </Link>
              </Button>
              <Button
                variant="outline"
                size="xl"
                onClick={() => setShowTrialDialog(true)}
              >
                <Play className="w-5 h-5" />
                试一试（无需注册）
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-8 max-w-lg mx-auto">
              <div className="text-center">
                <div className="font-comic text-3xl md:text-4xl text-secondary">
                  10+
                </div>
                <div className="text-sm text-muted-foreground">漫画风格</div>
              </div>
              <div className="text-center">
                <div className="font-comic text-3xl md:text-4xl text-accent">
                  50+
                </div>
                <div className="text-sm text-muted-foreground">预设角色</div>
              </div>
              <div className="text-center">
                <div className="font-comic text-3xl md:text-4xl text-primary">
                  4步
                </div>
                <div className="text-sm text-muted-foreground">完成创作</div>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Guide */}
        <WorkflowGuide className="px-4 py-12 -mt-8" />

        {/* Try It Section */}
        <section className="px-4 py-12 bg-gradient-to-b from-transparent to-muted/30">
          <div className="max-w-4xl mx-auto">
            <div className="comic-card p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/20 mb-6">
                <Play className="w-8 h-8 text-secondary" />
              </div>
              <h2 className="font-comic text-3xl text-foreground mb-4">
                30 秒体验 AI 漫画生成
              </h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                不需要注册，输入一句话描述，AI 立即为你生成 4 格漫画预览。
                <br />
                喜欢就注册保存，继续编辑。
              </p>
              <Button
                variant="comic"
                size="lg"
                onClick={() => setShowTrialDialog(true)}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                立即体验
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </section>

        {/* Quick Access */}
        <section className="px-4 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              <div>
                <h2 className="font-comic text-3xl text-foreground">
                  快速入口
                </h2>
                <p className="text-muted-foreground">
                  剧本、分镜、漫画素材一键进入
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                需要登录后访问
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recordShortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group rounded-xl border border-border bg-card/60 hover:border-primary/50 transition-colors p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-foreground group-hover:text-primary">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                    <span className="text-sm text-primary font-medium">
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
        <footer className="py-12 px-4 border-t border-border">
          <div className="max-w-7xl mx-auto text-center">
            <div className="font-comic text-2xl text-foreground mb-4">
              ComicAI
            </div>
            <p className="text-muted-foreground text-sm">
              用 AI 释放你的创意，创造属于你的漫画世界
            </p>
            <p className="text-muted-foreground/60 text-xs mt-4">
              &copy; 2024 ComicAI. All rights reserved.
            </p>
          </div>
        </footer>
      </main>

      {/* Trial Dialog */}
      <TrialDialog open={showTrialDialog} onOpenChange={setShowTrialDialog} />

      {/* Onboarding Dialog */}
      <OnboardingDialog onOpenTrialDialog={handleOpenTrialFromOnboarding} />
    </div>
  );
};

export default HomePage;
