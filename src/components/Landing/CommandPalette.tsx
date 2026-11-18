"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  LayoutDashboard,
  FileCode,
  FolderOpen,
  Image,
  UserCircle,
  MapPin,
  Shield,
  BookOpen,
  Grid3X3,
  LayoutTemplate,
  Palette,
  Workflow,
  BarChart3,
  Search,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  keywords: string[];
  category: string;
  adminOnly?: boolean;
}

const commands: Command[] = [
  // 创作
  {
    id: "workspace",
    title: "创作工作台",
    description: "统一创作入口与最近项目",
    icon: LayoutDashboard,
    href: "/workspace",
    keywords: ["工作台", "workspace", "入口", "创作中心"],
    category: "创作",
  },
  {
    id: "projects",
    title: "我的项目",
    description: "剧本、角色、分镜都在项目里",
    icon: FolderOpen,
    href: "/projects",
    keywords: ["项目", "作品", "剧本", "分镜", "project", "script"],
    category: "创作",
  },
  {
    id: "project-create",
    title: "新建项目",
    description: "从故事构思开始一个新项目",
    icon: Sparkles,
    href: "/story",
    keywords: ["新建", "故事", "创作", "story", "create"],
    category: "创作",
  },
  {
    id: "novel",
    title: "小说",
    description: "AI 辅助小说写作，可改编为项目",
    icon: FileCode,
    href: "/novel",
    keywords: ["小说", "novel", "写作"],
    category: "创作",
  },
  // 资产库
  {
    id: "assets-characters",
    title: "角色库",
    description: "管理角色素材",
    icon: UserCircle,
    href: "/assets?tab=characters",
    keywords: ["角色", "人物", "character", "资产"],
    category: "资产库",
  },
  {
    id: "assets-scenes",
    title: "场景库",
    description: "管理场景素材",
    icon: MapPin,
    href: "/assets?tab=scenes",
    keywords: ["场景", "背景", "scene", "资产"],
    category: "资产库",
  },
  {
    id: "templates",
    title: "模板市场",
    description: "浏览和使用模板",
    icon: LayoutTemplate,
    href: "/templates",
    keywords: ["模板", "template", "市场"],
    category: "资产库",
  },
  // 工具
  {
    id: "storyboard",
    title: "快速分镜",
    description: "粘贴文本直接生成分镜项目",
    icon: BookOpen,
    href: "/storyboard",
    keywords: ["分镜", "快速", "storyboard", "panel"],
    category: "工具",
  },
  {
    id: "generated",
    title: "生成图库",
    description: "浏览生成的图片",
    icon: Image,
    href: "/generated",
    keywords: ["图库", "生成", "图片", "image", "gallery"],
    category: "工具",
  },
  {
    id: "workflow",
    title: "一键生成",
    description: "自动化工作流程",
    icon: Workflow,
    href: "/workflow",
    keywords: ["工作流", "自动化", "workflow", "批量"],
    category: "工具",
  },
  {
    id: "editor",
    title: "画面精炼",
    description: "图像编辑和优化",
    icon: Palette,
    href: "/editor",
    keywords: ["编辑", "精炼", "优化", "editor", "refine"],
    category: "工具",
  },
  // 管理中心
  {
    id: "admin",
    title: "管理中心",
    description: "系统管理与配置",
    icon: Shield,
    href: "/admin",
    keywords: ["管理", "admin", "设置", "配置"],
    category: "管理中心",
    adminOnly: true,
  },
  {
    id: "admin-usage",
    title: "用量统计",
    description: "查看用量数据",
    icon: BarChart3,
    href: "/admin/usage",
    keywords: ["用量", "统计", "usage", "数据"],
    category: "管理中心",
    adminOnly: true,
  },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string | null;
}

export function CommandPalette({ open, onOpenChange, userRole }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter commands based on search and user role
  const filteredCommands = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return commands
      .filter((cmd) => {
        // Filter by admin role
        if (cmd.adminOnly && userRole !== "admin") return false;

        // Filter by search
        if (!search) return true;

        return (
          cmd.title.toLowerCase().includes(lowerSearch) ||
          cmd.description.toLowerCase().includes(lowerSearch) ||
          cmd.keywords.some((keyword) => keyword.toLowerCase().includes(lowerSearch))
        );
      });
  }, [search, userRole]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          router.push(selected.href);
          onOpenChange(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedIndex, filteredCommands, router, onOpenChange]);

  const handleSelect = useCallback((command: Command) => {
    router.push(command.href);
    onOpenChange(false);
  }, [router, onOpenChange]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-2xl bg-[#0a0a0a] border-zinc-800">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Search className="w-5 h-5 text-zinc-500" />
          <Input
            placeholder="搜索功能或输入命令..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder:text-zinc-600"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">没有找到匹配的结果</p>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedCommands).map(([category, cmds]) => (
                <div key={category}>
                  <div className="px-4 py-2 text-xs font-mono text-zinc-600 uppercase tracking-wider">
                    {category}
                  </div>
                  <div className="px-2 space-y-1">
                    {cmds.map((cmd, index) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      const isSelected = globalIndex === selectedIndex;
                      const Icon = cmd.icon;

                      return (
                        <button
                          key={cmd.id}
                          onClick={() => handleSelect(cmd)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded transition-colors text-left",
                            isSelected
                              ? "bg-orange-500/10 text-orange-500"
                              : "text-zinc-300 hover:bg-zinc-900"
                          )}
                        >
                          <div className={cn(
                            "p-2 rounded",
                            isSelected ? "bg-orange-500/20" : "bg-zinc-900"
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{cmd.title}</div>
                            <div className={cn(
                              "text-xs truncate",
                              isSelected ? "text-orange-400" : "text-zinc-500"
                            )}>
                              {cmd.description}
                            </div>
                          </div>
                          <ArrowRight className={cn(
                            "w-4 h-4 flex-shrink-0",
                            isSelected ? "opacity-100" : "opacity-0"
                          )} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 text-xs text-zinc-600">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px]">↓</kbd>
              <span className="ml-1">导航</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px]">↵</kbd>
              <span className="ml-1">选择</span>
            </div>
          </div>
          <div className="text-[10px] font-mono">
            {filteredCommands.length} 个结果
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
