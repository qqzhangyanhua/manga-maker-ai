/**
 * 项目详情页加载骨架屏
 * Sprint 2 Task 2.4: 提取为独立组件提升可维护性
 */

export function ProjectDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/40 via-zinc-900 to-black">
      <div className="container mx-auto py-12 px-4 max-w-7xl">
        <div className="animate-pulse space-y-8">
          {/* 头部骨架 */}
          <div className="flex justify-between items-center">
            <div className="space-y-3 w-1/3">
              <div className="h-10 bg-zinc-800/50 rounded-lg w-full"></div>
              <div className="h-4 bg-zinc-800/50 rounded w-2/3"></div>
            </div>
            <div className="h-10 w-32 bg-zinc-800/50 rounded"></div>
          </div>

          {/* 标签页骨架 */}
          <div className="h-12 bg-zinc-800/50 rounded-lg w-full"></div>

          {/* 内容区骨架 */}
          <div className="grid grid-cols-12 gap-6 mt-8">
            <div className="col-span-3 h-[600px] bg-zinc-900/40 backdrop-blur-sm rounded-xl border border-purple-500/10"></div>
            <div className="col-span-9 h-[600px] bg-zinc-900/40 backdrop-blur-sm rounded-xl border border-purple-500/10"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
