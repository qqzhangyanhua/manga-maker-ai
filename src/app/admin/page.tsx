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
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";

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
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <ShieldCheck className="w-7 h-7" />
          管理后台
        </h1>
        <p className="text-muted-foreground">
          管理员功能导航。根据权限进入对应的配置页面。
        </p>
      </div>

      {/* 系统配置模块 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">系统配置</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-border rounded-lg bg-card flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1 text-lg font-semibold">
                <Database className="w-5 h-5" />
              管理模型配置
            </div>
            <p className="text-muted-foreground text-sm">
              配置 provider_type 对应的模型、base_url、优先级、启用状态。
            </p>
          </div>
          <Link href="/admin/llm-providers">
            <Button variant="outline" size="sm">
              进入
            </Button>
          </Link>
        </div>
        <div className="p-4 border border-border rounded-lg bg-card flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 text-lg font-semibold">
              <Palette className="w-5 h-5" />
              漫画风格管理
            </div>
            <p className="text-muted-foreground text-sm">
              管理首页展示的漫画风格，包括新增、编辑、排序和启用/禁用。
            </p>
          </div>
          <Link href="/admin/comic-styles">
            <Button variant="outline" size="sm">
              进入
            </Button>
          </Link>
        </div>
        <div className="p-4 border border-border rounded-lg bg-card flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 text-lg font-semibold">
              <BookOpen className="w-5 h-5" />
              故事模板管理
            </div>
            <p className="text-muted-foreground text-sm">
              管理故事生成模板，支持新增、编辑系统模板和用户模板。
            </p>
          </div>
          <Link href="/admin/story-templates">
            <Button variant="outline" size="sm">
              进入
            </Button>
          </Link>
        </div>
        <div className="p-4 border border-border rounded-lg bg-card flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 text-lg font-semibold">
              <LayoutTemplate className="w-5 h-5" />
              分镜模板管理
            </div>
            <p className="text-muted-foreground text-sm">
              管理分镜模板，支持新增、编辑官方模板和用户模板。
            </p>
          </div>
          <Link href="/admin/panel-templates">
            <Button variant="outline" size="sm">
              进入
            </Button>
          </Link>
        </div>
        <div className="p-4 border border-border rounded-lg bg-card flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 text-lg font-semibold">
              <Sparkles className="w-5 h-5" />
              角色库管理
            </div>
            <p className="text-muted-foreground text-sm">
              查看并管理所有用户创建的角色，支持增删改查与状态维护。
            </p>
          </div>
          <Link href="/admin/characters">
            <Button variant="outline" size="sm">
              进入
            </Button>
          </Link>
        </div>
        <div className="p-4 border border-border rounded-lg bg-card flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 text-lg font-semibold">
              <Users className="w-5 h-5" />
              用户管理
            </div>
            <p className="text-muted-foreground text-sm">
              手动新增/编辑/封禁/删除用户，免验证码创建。
            </p>
          </div>
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              进入
            </Button>
          </Link>
        </div>
        <div className="p-4 border border-border rounded-lg bg-card flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 text-lg font-semibold">
              <BarChart3 className="w-5 h-5" />
              用量与日志
            </div>
            <p className="text-muted-foreground text-sm">
              查看每日配额使用与生成日志，支持按用户筛选与限制条数。
            </p>
          </div>
          <Link href="/admin/usage">
            <Button variant="outline" size="sm">
              进入
            </Button>
          </Link>
        </div>
        </div>
      </div>

      {/* 运营监控模块 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">运营监控</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-border rounded-lg bg-card flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1 text-lg font-semibold">
                <FileText className="w-5 h-5" />
                生成日志
              </div>
              <p className="text-muted-foreground text-sm">
                监控所有 AI 生成调用，查看请求/响应详情、成功率和耗时统计。
              </p>
            </div>
            <Link href="/admin/generation-logs">
              <Button variant="outline" size="sm">
                进入
              </Button>
            </Link>
          </div>
          <div className="p-4 border border-border rounded-lg bg-card flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1 text-lg font-semibold">
                <ImageIcon className="w-5 h-5" />
                生成图片
              </div>
              <p className="text-muted-foreground text-sm">
                审核管理所有 AI 生成的图片，支持批量删除和详情查看。
              </p>
            </div>
            <Link href="/admin/generated-images">
              <Button variant="outline" size="sm">
                进入
              </Button>
            </Link>
          </div>
          <div className="p-4 border border-border rounded-lg bg-card flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1 text-lg font-semibold">
                <GitBranch className="w-5 h-5" />
                工作流监控
              </div>
              <p className="text-muted-foreground text-sm">
                查看自动化工作流执行状态，支持取消和重试操作。
              </p>
            </div>
            <Link href="/admin/workflows">
              <Button variant="outline" size="sm">
                进入
              </Button>
            </Link>
          </div>
          <div className="p-4 border border-border rounded-lg bg-card flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1 text-lg font-semibold">
                <ListTodo className="w-5 h-5" />
                生成任务
              </div>
              <p className="text-muted-foreground text-sm">
                监控批量图片生成任务队列，查看进度和取消任务。
              </p>
            </div>
            <Link href="/admin/generation-tasks">
              <Button variant="outline" size="sm">
                进入
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 业务数据管理 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">业务数据</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-border rounded-lg bg-card flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1 text-lg font-semibold">
                <Map className="w-5 h-5" />
                场景管理
              </div>
              <p className="text-muted-foreground text-sm">
                管理场景库，包括室内、室外、城市、自然等各类场景资源。
              </p>
            </div>
            <Link href="/admin/scenes">
              <Button variant="outline" size="sm">
                进入
              </Button>
            </Link>
          </div>
          <div className="p-4 border border-border rounded-lg bg-card flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1 text-lg font-semibold">
                <BookOpen className="w-5 h-5" />
                故事管理
              </div>
              <p className="text-muted-foreground text-sm">
                查看和管理用户创建的故事，包括大纲和脚本内容。
              </p>
            </div>
            <Link href="/admin/stories">
              <Button variant="outline" size="sm">
                进入
              </Button>
            </Link>
          </div>
          <div className="p-4 border border-border rounded-lg bg-card flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1 text-lg font-semibold">
                <FolderKanban className="w-5 h-5" />
                项目管理
              </div>
              <p className="text-muted-foreground text-sm">
                管理用户的漫画项目，查看面板数量和项目状态。
              </p>
            </div>
            <Link href="/admin/projects">
              <Button variant="outline" size="sm">
                进入
              </Button>
            </Link>
          </div>
          <div className="p-4 border border-border rounded-lg bg-card flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1 text-lg font-semibold">
                <Tags className="w-5 h-5" />
                标签管理
              </div>
              <p className="text-muted-foreground text-sm">
                管理系统标签和用户标签，支持按类型和分类筛选。
              </p>
            </div>
            <Link href="/admin/tags">
              <Button variant="outline" size="sm">
                进入
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHomePage;
