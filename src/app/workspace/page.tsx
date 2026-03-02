import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Plus,
  FileText,
  BookText,
  ArrowRight,
  FolderOpen,
  Users,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Landing";
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";

interface RecentStory {
  id: string;
  title: string;
  premise?: string | null;
  style?: string | null;
  created_at: string;
  updated_at?: string | null;
  _count?: { panels: number };
}

const QUICK_ACTIONS = [
  {
    icon: Plus,
    title: "从零创作",
    description: "输入创意，AI 帮你生成完整的漫画剧本",
    href: "/story",
    gradient: "from-orange-500/20 to-orange-600/10",
    iconColor: "text-orange-400",
    borderHover: "hover:border-orange-500/50",
  },
  {
    icon: FileText,
    title: "导入文本",
    description: "粘贴故事文本，快速生成分镜画面",
    href: "/storyboard",
    gradient: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
    borderHover: "hover:border-blue-500/50",
  },
  {
    icon: BookText,
    title: "从小说转换",
    description: "将小说项目转换为漫画作品",
    href: "/novel",
    gradient: "from-purple-500/20 to-purple-600/10",
    iconColor: "text-purple-400",
    borderHover: "hover:border-purple-500/50",
  },
];

export const dynamic = "force-dynamic";

async function getRecentStories(): Promise<RecentStory[]> {
  const user = await getCurrentUser();
  if (!user?.userId) {
    return [];
  }

  const storiesRaw = await prisma.story.findMany({
    where: { user_id: user.userId },
    orderBy: {
      updated_at: "desc",
    },
    take: 6,
    include: {
      chapters: {
        include: {
          _count: { select: { panels: true } },
        },
      },
    },
  });

  return storiesRaw.map(({ chapters, ...rest }) => ({
    id: rest.id,
    title: rest.title,
    premise: rest.premise,
    style: null,
    created_at: rest.created_at.toISOString(),
    updated_at: rest.updated_at?.toISOString() ?? null,
    _count: {
      panels: chapters.reduce((acc, chapter) => acc + chapter._count.panels, 0),
    },
  }));
}

export default async function WorkspacePage() {
  const stories = await getRecentStories();

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white">
      <Navbar />

      <div className="fixed top-20 left-1/4 w-96 h-96 bg-orange-500/5 blur-3xl rounded-full pointer-events-none" />
      <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-purple-500/5 blur-3xl rounded-full pointer-events-none" />

      <main className="pt-24 px-4 sm:px-6 lg:px-8 pb-16 relative z-10">
        <div className="max-w-6xl mx-auto">
          <PageBreadcrumb segments={[{ label: "工作台" }]} className="mb-6" />

          {/* Hero */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-white mb-2">创作工作台</h1>
            <p className="text-zinc-400">所有作品、一站管理。选择一种方式开始创作。</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href}>
                <GlassCard
                  className={cn(
                    "group p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                    action.borderHover
                  )}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4",
                      action.gradient
                    )}
                  >
                    <action.icon className={cn("w-6 h-6", action.iconColor)} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-orange-400 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-zinc-400">{action.description}</p>
                </GlassCard>
              </Link>
            ))}
          </div>

          {/* Recent Works */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">最近作品</h2>
              <Link href="/scripts">
                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                  查看全部
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            {stories.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <Sparkles className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-300 mb-2">还没有作品</h3>
                <p className="text-sm text-zinc-500 mb-6">选择上方的创作方式，开始你的第一个作品</p>
                <Link href="/story">
                  <Button className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="w-4 h-4 mr-2" />
                    创建新作品
                  </Button>
                </Link>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stories.map((story) => (
                  <Link key={story.id} href={`/scripts/${story.id}`}>
                    <GlassCard className="group p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/30">
                      <h3 className="font-semibold text-zinc-100 line-clamp-1 mb-2 group-hover:text-orange-400 transition-colors">
                        {story.title || "未命名作品"}
                      </h3>
                      <p className="text-sm text-zinc-500 line-clamp-2 mb-3 min-h-[2.5rem]">
                        {story.premise || "暂无描述"}
                      </p>
                      <div className="flex items-center justify-between text-xs text-zinc-600">
                        <span>
                          {story.updated_at
                            ? format(new Date(story.updated_at), "MM-dd HH:mm", { locale: zhCN })
                            : format(new Date(story.created_at), "MM-dd HH:mm", { locale: zhCN })}
                        </span>
                        {story._count?.panels !== undefined && (
                          <span>{story._count.panels} 分镜</span>
                        )}
                      </div>
                    </GlassCard>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: FolderOpen, label: "作品项目", href: "/projects" },
              { icon: Users, label: "角色库", href: "/assets?tab=characters" },
              { icon: Sparkles, label: "一键生成", href: "/workflow" },
              { icon: FileText, label: "小说创作", href: "/novel" },
            ].map((link) => (
              <Link key={link.href} href={link.href}>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all cursor-pointer">
                  <link.icon className="w-5 h-5 text-zinc-500" />
                  <span className="text-sm text-zinc-400">{link.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
