import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { BookOpen, Grid3X3, LayoutPanelTop, MoreHorizontal, Calendar, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import { Project } from "./types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const generatedCount = project.panels.filter((p) => p.generated_image).length;
  const panelCount = project.panels.length;
  const progress = panelCount > 0 ? Math.round((generatedCount / panelCount) * 100) : 0;

  return (
    <GlassCard 
      className="group relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10"
      variant="default"
    >
      {/* 顶部高光装饰 */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="p-5 flex flex-col h-full gap-4">
        {/* 头部信息 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 ring-1 ring-white/10 flex items-center justify-center group-hover:ring-orange-500/30 transition-all">
              {project.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={project.cover_image} alt={project.title} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <Grid3X3 className="w-6 h-6 text-orange-500/80" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100 line-clamp-1 group-hover:text-orange-400 transition-colors">
                {project.title || "未命名项目"}
              </h3>
              <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md border border-white/5",
                  project.status === 'completed' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-zinc-800/50"
                )}>
                  {project.status === 'draft' ? '草稿' : project.status}
                </span>
                <span>•</span>
                <span className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {project.updated_at
                    ? format(new Date(project.updated_at), "MM-dd", { locale: zhCN })
                    : "刚刚"}
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-200">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-zinc-900 border-zinc-800 text-zinc-300">
              <DropdownMenuItem className="focus:bg-zinc-800 focus:text-white cursor-pointer">
                重命名
              </DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-zinc-800 focus:text-red-400 text-red-500 cursor-pointer">
                删除项目
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 描述区域 */}
        <div className="flex-1 min-h-[3rem]">
          <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">
            {project.description || "暂无项目描述..."}
          </p>
        </div>

        {/* 进度统计 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              {generatedCount}/{panelCount} 分镜
            </span>
            <span className={cn(
              "font-mono",
              progress === 100 ? "text-green-400" : "text-orange-400"
            )}>{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="grid grid-cols-2 gap-2 mt-2 pt-4 border-t border-white/5">
          <Link href={`/storyboard/editor/${project.id}`} className="w-full">
            <Button className="w-full bg-zinc-800 hover:bg-orange-500 hover:text-white text-zinc-300 border border-zinc-700 hover:border-orange-500 transition-all shadow-none" size="sm">
              <BookOpen className="w-4 h-4 mr-2" />
              编辑
            </Button>
          </Link>
          <Link href={`/layout-editor/${project.id}`} className="w-full">
            <Button variant="outline" className="w-full bg-transparent border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800" size="sm">
              <LayoutPanelTop className="w-4 h-4 mr-2" />
              排版
            </Button>
          </Link>
        </div>
      </div>
    </GlassCard>
  );
}
