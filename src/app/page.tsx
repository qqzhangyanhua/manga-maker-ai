"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { BarChart3, BookOpen, FileText, Images, Play, ArrowRight, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkflowGuide } from "@/components/WorkflowGuide";
import { TrialDialog } from "@/components/TrialDialog";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { HeroSection } from "@/components/Landing";

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

  // 回调函数：从 OnboardingDialog 打开 TrialDialog
  const handleOpenTrialFromOnboarding = useCallback(() => {
    setShowTrialDialog(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      <main>
        {/* Hero Section with futuristic manga studio style */}
        <HeroSection onOpenTrial={() => setShowTrialDialog(true)} />

        {/* Workflow Guide */}
        <WorkflowGuide className="px-4 py-12 -mt-8" />

        {/* Try It Section */}
        <section className="px-4 py-16 bg-gradient-to-b from-slate-950 to-slate-900">
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-6">
                <Play className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                30 秒体验 AI 漫画生成
              </h2>
              <p className="text-slate-400 mb-6 max-w-xl mx-auto">
                不需要注册，输入一句话描述，AI 立即为你生成 4 格漫画预览。
                <br />
                喜欢就注册保存，继续编辑。
              </p>
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0"
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
        <section className="px-4 py-16 bg-slate-900">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white">
                  快速入口
                </h2>
                <p className="text-slate-400">
                  示例项目、剧本、分镜、漫画素材一键进入
                </p>
              </div>
              <div className="text-xs text-slate-500">
                需要登录后访问
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {recordShortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group rounded-xl border border-slate-700/50 bg-slate-800/50 hover:border-purple-500/50 hover:bg-slate-800 transition-all p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                    <span className="text-sm text-purple-400 font-medium">
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
        <footer className="py-12 px-4 border-t border-slate-800 bg-slate-950">
          <div className="max-w-7xl mx-auto text-center">
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
              ComicAI
            </div>
            <p className="text-slate-400 text-sm">
              用 AI 释放你的创意，创造属于你的漫画世界
            </p>
            <p className="text-slate-600 text-xs mt-4">
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
