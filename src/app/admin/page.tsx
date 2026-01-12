"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Database,
  Users,
  Palette,
  Sparkles,
  BarChart3,
  BookOpen,
  LayoutTemplate,
  FileText,
  ImageIcon,
  Map,
  FolderKanban,
  GitBranch,
  ListTodo,
  Tags,
  Receipt,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const AdminHomePage = () => {
  const { data: currentUser, isLoading, error } = useCurrentUser();
  const isAdmin = (currentUser?.role || "user") === "admin";

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          管理后台
        </h1>
        <p>正在加载用户信息...</p>
      </div>
    );
  }

  if (error || !currentUser) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          管理后台
        </h1>
        <p>请先登录后访问本页面。</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          管理后台
        </h1>
        <p>当前账号权限不足，需要管理员角色。</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen halftone-pattern">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        <div className="relative">
          <div className="absolute right-0 top-0 z-20">
            <ThemeToggle />
          </div>
          <div className="absolute -left-4 -top-4 w-20 h-20 bg-yellow-400 rounded-full blur-3xl opacity-20 animate-pulse" />
          <h1 className="text-5xl font-bold mb-4 flex items-center gap-3 comic-title relative z-10">
            <ShieldCheck className="w-12 h-12 text-primary drop-shadow-md" />
            管理后台
          </h1>
          <p className="text-xl text-muted-foreground font-medium pl-2 border-l-4 border-primary/50">
            欢迎回来，指挥官！这里是您的漫画创作指挥中心。
          </p>
        </div>

        {/* 系统配置模块 - 蓝色科技风 */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-blue-500">
            <span className="w-2 h-8 bg-blue-500 rounded-full inline-block" />
            系统配置 System
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 comic-card border-2 border-zinc-900 dark:border-zinc-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl group hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-zinc-800 hover:border-blue-500 hover:shadow-[4px_4px_0px_0px_#3b82f6]">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-bold group-hover:text-blue-500 transition-colors">
                    <Database className="w-6 h-6 text-blue-500" />
                    模型配置
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    配置 AI 核心引擎。管理 provider_type、base_url 及模型优先级。
                  </p>
                </div>
                <Link href="/admin/llm-providers">
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    进入 &rarr;
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 comic-card border-2 border-zinc-900 dark:border-zinc-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl group hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-zinc-800 hover:border-blue-500 hover:shadow-[4px_4px_0px_0px_#3b82f6]">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-bold group-hover:text-blue-500 transition-colors">
                    <Palette className="w-6 h-6 text-blue-500" />
                    漫画风格
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    定义视觉基调。管理首页展示的漫画风格与排序。
                  </p>
                </div>
                <Link href="/admin/comic-styles">
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    进入 &rarr;
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 comic-card border-2 border-zinc-900 dark:border-zinc-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl group hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-zinc-800 hover:border-blue-500 hover:shadow-[4px_4px_0px_0px_#3b82f6]">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-bold group-hover:text-blue-500 transition-colors">
                    <BookOpen className="w-6 h-6 text-blue-500" />
                    故事模板
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    创意蓝图。管理官方和用户的故事生成模板。
                  </p>
                </div>
                <Link href="/admin/story-templates">
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    进入 &rarr;
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 comic-card border-2 border-zinc-900 dark:border-zinc-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl group hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-zinc-800 hover:border-blue-500 hover:shadow-[4px_4px_0px_0px_#3b82f6]">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-bold group-hover:text-blue-500 transition-colors">
                    <LayoutTemplate className="w-6 h-6 text-blue-500" />
                    分镜模板
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    画面构图。管理分镜布局模板，掌控叙事节奏。
                  </p>
                </div>
                <Link href="/admin/panel-templates">
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    进入 &rarr;
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 comic-card border-2 border-zinc-900 dark:border-zinc-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl group hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-zinc-800 hover:border-blue-500 hover:shadow-[4px_4px_0px_0px_#3b82f6]">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-bold group-hover:text-blue-500 transition-colors">
                    <Sparkles className="w-6 h-6 text-blue-500" />
                    角色库
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    演员阵容。查看所有用户创建的角色与设定。
                  </p>
                </div>
                <Link href="/admin/characters">
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    进入 &rarr;
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 comic-card border-2 border-zinc-900 dark:border-zinc-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl group hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-zinc-800 hover:border-blue-500 hover:shadow-[4px_4px_0px_0px_#3b82f6]">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-bold group-hover:text-blue-500 transition-colors">
                    <Users className="w-6 h-6 text-blue-500" />
                    用户管理
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    用户名单。管理用户权限、封禁与免验证创建。
                  </p>
                </div>
                <Link href="/admin/users">
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    进入 &rarr;
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 comic-card border-2 border-zinc-900 dark:border-zinc-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl group hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-zinc-800 hover:border-blue-500 hover:shadow-[4px_4px_0px_0px_#3b82f6]">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-bold group-hover:text-blue-500 transition-colors">
                    <Receipt className="w-6 h-6 text-blue-500" />
                    交易历史
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    算力流水。查看所有用户的充值、消费与交易记录。
                  </p>
                </div>
                <Link href="/admin/transactions">
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    进入 &rarr;
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 comic-card border-2 border-zinc-900 dark:border-zinc-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl group hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-zinc-800 hover:border-blue-500 hover:shadow-[4px_4px_0px_0px_#3b82f6]">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-bold group-hover:text-blue-500 transition-colors">
                    <BarChart3 className="w-6 h-6 text-blue-500" />
                    用量与日志
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    能源监控。查看每日配额消耗与详细系统日志。
                  </p>
                </div>
                <Link href="/admin/usage">
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    进入 &rarr;
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 运营监控模块 - 紫色神秘风 */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-purple-500">
            <span className="w-2 h-8 bg-purple-500 rounded-full inline-block" />
            运营监控 Operations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 comic-card border-2 border-zinc-900 dark:border-zinc-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl group hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-zinc-800 hover:border-purple-500 hover:shadow-[4px_4px_0px_0px_#a855f7]">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-bold group-hover:text-purple-500 transition-colors">
                    <FileText className="w-6 h-6 text-purple-500" />
                    生成日志
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    核心记录。监控所有 AI 生成调用的请求与响应详情。
                  </p>
                </div>
                <Link href="/admin/generation-logs">
                  <Button size="sm" className="bg-purple-500 hover:bg-purple-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    进入 &rarr;
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 comic-card border-2 border-zinc-900 dark:border-zinc-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl group hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-zinc-800 hover:border-purple-500 hover:shadow-[4px_4px_0px_0px_#a855f7]">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-bold group-hover:text-purple-500 transition-colors">
                    <ImageIcon className="w-6 h-6 text-purple-500" />
                    图片画廊
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    成品审核。管理所有 AI 生成的图片资源。
                  </p>
                </div>
                <Link href="/admin/generated-images">
                  <Button size="sm" className="bg-purple-500 hover:bg-purple-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    进入 &rarr;
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 comic-card border-2 border-zinc-900 dark:border-zinc-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl group hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-zinc-800 hover:border-purple-500 hover:shadow-[4px_4px_0px_0px_#a855f7]">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-bold group-hover:text-purple-500 transition-colors">
                    <GitBranch className="w-6 h-6 text-purple-500" />
                    工作流监控
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    流水线。查看自动化工作流执行状态与干预。
                  </p>
                </div>
                <Link href="/admin/workflows">
                  <Button size="sm" className="bg-purple-500 hover:bg-purple-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    进入 &rarr;
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 comic-card border-2 border-zinc-900 dark:border-zinc-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl group hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-zinc-800 hover:border-purple-500 hover:shadow-[4px_4px_0px_0px_#a855f7]">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-bold group-hover:text-purple-500 transition-colors">
                    <ListTodo className="w-6 h-6 text-purple-500" />
                    任务队列
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    生产计划。监控批量图片生成任务的进度。
                  </p>
                </div>
                <Link href="/admin/generation-tasks">
                  <Button size="sm" className="bg-purple-500 hover:bg-purple-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    进入 &rarr;
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 业务数据管理 - 橙色活力风 */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-orange-500">
            <span className="w-2 h-8 bg-orange-500 rounded-full inline-block" />
            业务数据 Business
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 comic-card border-2 border-zinc-900 dark:border-zinc-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl group hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-zinc-800 hover:border-orange-500 hover:shadow-[4px_4px_0px_0px_#f97316]">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-bold group-hover:text-orange-500 transition-colors">
                    <Map className="w-6 h-6 text-orange-500" />
                    场景库
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    取景地。管理室内、室外、城市等场景资源。
                  </p>
                </div>
                <Link href="/admin/scenes">
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    进入 &rarr;
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 comic-card border-2 border-zinc-900 dark:border-zinc-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl group hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-zinc-800 hover:border-orange-500 hover:shadow-[4px_4px_0px_0px_#f97316]">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-bold group-hover:text-orange-500 transition-colors">
                    <BookOpen className="w-6 h-6 text-orange-500" />
                    故事数据
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    剧本库。查看和管理用户创建的精彩故事。
                  </p>
                </div>
                <Link href="/admin/stories">
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    进入 &rarr;
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 comic-card border-2 border-zinc-900 dark:border-zinc-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl group hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-zinc-800 hover:border-orange-500 hover:shadow-[4px_4px_0px_0px_#f97316]">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-bold group-hover:text-orange-500 transition-colors">
                    <FolderKanban className="w-6 h-6 text-orange-500" />
                    项目管理
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    作品集。管理用户的漫画项目与连载状态。
                  </p>
                </div>
                <Link href="/admin/projects">
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    进入 &rarr;
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 comic-card border-2 border-zinc-900 dark:border-zinc-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl group hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-zinc-800 hover:border-orange-500 hover:shadow-[4px_4px_0px_0px_#f97316]">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-bold group-hover:text-orange-500 transition-colors">
                    <Tags className="w-6 h-6 text-orange-500" />
                    标签管理
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    关键词。管理系统标签体系与用户分类。
                  </p>
                </div>
                <Link href="/admin/tags">
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    进入 &rarr;
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHomePage;
