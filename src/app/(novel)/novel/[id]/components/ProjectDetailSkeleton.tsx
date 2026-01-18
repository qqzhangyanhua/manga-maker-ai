import { novelTheme } from "../../theme";
import { cn } from "@/lib/utils";

export function ProjectDetailSkeleton() {
  return (
    <div className={novelTheme.layout.background}>
      <div className={novelTheme.layout.container}>
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
            <div className={cn("col-span-3 h-[600px] rounded-xl border", novelTheme.card.base)}></div>
            <div className={cn("col-span-9 h-[600px] rounded-xl border", novelTheme.card.base)}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
