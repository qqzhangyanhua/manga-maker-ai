import { useUsage } from "@/hooks/use-usage";
import { cn } from "@/lib/utils";
import { Loader2, Zap } from "lucide-react";

export function UsageStats() {
  const { usage, loading } = useUsage();

  const renderBadge = (
    label: string,
    item?: { remaining: number | null; limit: number | null; count: number }
  ) => {
    const remaining = item?.remaining ?? null;
    const limit = item?.limit ?? null;
    const isLow = typeof remaining === "number" && remaining <= 3;
    const isExhausted = typeof remaining === "number" && remaining <= 0;
    
    return (
      <div className={cn(
        "relative overflow-hidden rounded-lg border px-3 py-2 text-sm backdrop-blur-md transition-all",
        isExhausted
          ? "border-red-500/30 bg-red-500/10 text-red-400"
          : isLow
          ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
          : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
      )}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-500 font-medium">{label}</span>
          <span className={cn(
            "font-mono font-semibold text-xs",
            isExhausted ? "text-red-400" : isLow ? "text-yellow-400" : "text-zinc-300"
          )}>
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : limit ? (
              `${remaining ?? "-"} / ${limit}`
            ) : (
              "∞"
            )}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex items-center gap-2 text-xs text-orange-500/80 font-medium px-2">
        <Zap className="w-3.5 h-3.5" />
        <span>今日额度</span>
      </div>
      {renderBadge("分镜生成", usage?.storyboard_generation)}
      {renderBadge("图像生成", usage?.image_generation)}
      {renderBadge("智能助手", usage?.llm_chat)}
    </div>
  );
}
