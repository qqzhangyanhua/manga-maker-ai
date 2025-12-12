import { UsageBadgeProps } from "../types";

export const UsageBadge = ({ label, item, loading }: UsageBadgeProps) => {
  const remaining = item?.remaining ?? null;
  const limit = item?.limit ?? null;
  const isLow = typeof remaining === "number" && remaining <= 3;
  const isExhausted = typeof remaining === "number" && remaining <= 0;
  const badgeClass = isExhausted
    ? "border-red-500/70 bg-red-500/10 text-red-600 dark:text-red-400"
    : isLow
      ? "border-yellow-500/60 bg-yellow-500/10"
      : "border-border";

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${badgeClass}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">
        {loading ? "加载中..." : limit ? `剩余 ${remaining ?? "-"} / ${limit}` : "无限制"}
      </div>
    </div>
  );
};
