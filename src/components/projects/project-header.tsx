import Link from "next/link";
import { ArrowLeft, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProjectHeaderProps {
  onSearchChange?: (value: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function ProjectHeader({ onSearchChange, onRefresh, isRefreshing }: ProjectHeaderProps) {
  return (
    <div className="space-y-6 mb-8">
      {/* 顶部导航与标题 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-orange-500 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回工作台
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            我的作品
            <span className="text-orange-500">.</span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-md">
            管理您所有的作品，支持编辑、导出及多人协作
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/storyboard">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20">
              <Plus className="w-4 h-4 mr-2" />
              新建分镜
            </Button>
          </Link>
        </div>
      </div>

      {/* 工具栏：搜索与筛选 */}
      <div className="flex flex-col sm:flex-row gap-4 p-1">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input 
            placeholder="搜索作品名称..." 
            className="pl-9 bg-zinc-900/50 border-zinc-800 focus:border-orange-500/50 focus:ring-orange-500/20 transition-all text-sm"
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
           <Button 
            variant="outline" 
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-10 border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <span className={isRefreshing ? "animate-spin mr-2" : "mr-2"}>
              {isRefreshing ? "⟳" : "↻"}
            </span>
            刷新
          </Button>
          <Button variant="outline" size="sm" className="h-10 border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800">
            <Filter className="w-3.5 h-3.5 mr-2" />
            筛选
          </Button>
        </div>
      </div>
    </div>
  );
}
