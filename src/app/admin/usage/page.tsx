"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, User, CalendarClock, List, Filter, Download, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { UsageStat, GenerationLog, actionLabels } from "./types";

const AdminUsagePage = () => {
  const [userId, setUserId] = useState("");
  const [days, setDays] = useState(7);
  const [limit, setLimit] = useState(50);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [action, setAction] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [usageStats, setUsageStats] = useState<UsageStat[]>([]);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const usageChartData = usageStats.reduce<Record<string, { count: number; date: string }>>((acc, item) => {
    const key = `${item.action}-${item.date}`;
    acc[key] = { count: item.count, date: item.date };
    return acc;
  }, {});

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        days: String(days),
        limit: String(limit),
      });
      if (userId.trim()) params.set("userId", userId.trim());
      if (action !== "all") params.set("action", action);
      if (status !== "all") params.set("status", status);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`/api/admin/usage?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "获取用量失败");
      }
      const data = await res.json();
      setUsageStats(data.data.usageStats || []);
      setLogs(data.data.generationLogs || []);
    } catch (error) {
      console.error(error);
      toast({
        title: "获取用量失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回后台
          </Link>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} />
            刷新
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-semibold">用量与生成日志</h1>
          <p className="text-muted-foreground text-sm">
            按用户和时间窗口查看配额消耗与生成记录，便于排查异常与成本控制。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 border border-border rounded-lg bg-card">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <User className="w-4 h-4" />
              用户 ID（可选）
            </Label>
            <Input
              placeholder="过滤指定用户"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <CalendarClock className="w-4 h-4" />
              查看天数
            </Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <List className="w-4 h-4" />
              日志条数
            </Label>
            <Input
              type="number"
              min={10}
              max={200}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <CalendarClock className="w-4 h-4" />
              起始日期（可选）
            </Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <CalendarClock className="w-4 h-4" />
              结束日期（可选）
            </Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Filter className="w-4 h-4" />
              动作
            </Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              <option value="all">全部</option>
              <option value="storyboard_generation">分镜生成</option>
              <option value="image_generation">图像生成</option>
              <option value="llm_chat">聊天/LLM</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Filter className="w-4 h-4" />
              状态（日志）
            </Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">全部</option>
              <option value="success">成功</option>
              <option value="failed">失败</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={fetchData} disabled={loading}>
            查询
          </Button>
          <Button variant="secondary" onClick={() => exportCsv(usageStats, logs)} disabled={loading || (usageStats.length === 0 && logs.length === 0)}>
            <Download className="w-4 h-4 mr-2" />
            导出 CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-border rounded-lg bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="font-medium">日用量统计</div>
              <span className="text-xs text-muted-foreground">最近 {days} 天</span>
            </div>
            <div className="p-4 border-b border-border">
              <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                简易次数折线（按日期聚合）
              </div>
              <div className="flex items-end gap-2 overflow-x-auto pb-2">
                {Object.values(
                  usageStats.reduce<Record<string, { date: string; total: number }>>((acc, item) => {
                    const key = item.date;
                    acc[key] = acc[key] || { date: item.date, total: 0 };
                    acc[key].total += item.count;
                    return acc;
                  }, {})
                )
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((item) => {
                    const height = Math.min(item.total * 4, 120);
                    return (
                      <div key={item.date} className="flex flex-col items-center text-xs text-muted-foreground">
                        <div
                          className="w-6 bg-primary/70 rounded-t"
                          style={{ height: `${height}px` }}
                          title={`${item.total} 次`}
                        />
                        <span className="mt-1">{new Date(item.date).getDate()}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
            <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
              {loading && <div className="p-4 text-sm text-muted-foreground">加载中...</div>}
              {!loading && usageStats.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">暂无数据</div>
              )}
              {usageStats.map((item) => (
                <div key={`${item.id}-${item.date}`} className="px-4 py-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{actionLabels[item.action] || item.action}</div>
                    <div className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>用户：{item.user_id}</span>
                    <span>次数：{item.count}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    最后使用：{new Date(item.last_used_at).toLocaleString()}
                    {item.provider_type ? ` ｜ provider: ${item.provider_type}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-border rounded-lg bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="font-medium">生成日志</div>
              <span className="text-xs text-muted-foreground">最多 {limit} 条</span>
            </div>
            <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
              {loading && <div className="p-4 text-sm text-muted-foreground">加载中...</div>}
              {!loading && logs.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">暂无数据</div>
              )}
              {logs.map((log) => (
                <div key={log.id} className="px-4 py-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">
                      {actionLabels[log.action] || log.action} · {log.status === "success" ? "成功" : "失败"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    用户：{log.user_id}
                    {log.project_id ? ` ｜ 项目：${log.project_id}` : ""}
                    {log.provider_type ? ` ｜ provider: ${log.provider_type}` : ""}
                    {typeof log.duration_ms === "number" ? ` ｜ 耗时：${log.duration_ms} ms` : ""}
                  </div>
                  {log.error_message ? (
                    <div className="text-xs text-red-500">错误：{log.error_message}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsagePage;

function exportCsv(usageStats: UsageStat[], logs: GenerationLog[]) {
  const lines: string[] = [];
  lines.push("=== Usage Stats ===");
  lines.push("id,user_id,action,date,count,provider_type,last_used_at");
  usageStats.forEach((u) => {
    lines.push(
      [
        u.id,
        u.user_id,
        u.action,
        new Date(u.date).toISOString(),
        u.count,
        u.provider_type ?? "",
        new Date(u.last_used_at).toISOString(),
      ].join(",")
    );
  });
  lines.push("");
  lines.push("=== Generation Logs ===");
  lines.push("id,user_id,action,status,provider_type,project_id,duration_ms,created_at,error_message");
  logs.forEach((l) => {
    lines.push(
      [
        l.id,
        l.user_id,
        l.action,
        l.status,
        l.provider_type ?? "",
        l.project_id ?? "",
        l.duration_ms ?? "",
        new Date(l.created_at).toISOString(),
        l.error_message ? `"${l.error_message.replace(/"/g, '""')}"` : "",
      ].join(",")
    );
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "usage-and-logs.csv";
  link.click();
  URL.revokeObjectURL(url);
}
