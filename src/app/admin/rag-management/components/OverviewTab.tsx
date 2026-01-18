"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  TrendingUp,
  CheckCircle2,
  Activity,
  RefreshCw,
  Download,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RAGStats, RecentActivity } from "../types";

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, label, value, subtitle, trend }) => {
  return (
    <Card className="comic-card border-2 border-zinc-900 dark:border-zinc-600 hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="text-purple-500">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {trend === "up" && <TrendingUp className="w-3 h-3 text-green-500" />}
            {trend === "down" && <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />}
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const OverviewTab: React.FC = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<RAGStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/novel/rag/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats(data.stats);
      setRecentActivities(data.recentActivity || []);
    } catch (error) {
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "获取统计数据失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleConsistencyCheck = async () => {
    try {
      setActionLoading("consistency");
      const response = await fetch("/api/novel/rag/consistency-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Consistency check failed");
      const data = await response.json();

      toast({
        title: "一致性检查完成",
        description: `健康分数: ${data.healthScore.toFixed(1)}/100`,
      });
    } catch (error) {
      toast({
        title: "检查失败",
        description: error instanceof Error ? error.message : "一致性检查失败",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchRebuild = async () => {
    try {
      setActionLoading("rebuild");
      const response = await fetch("/api/novel/rag/rebuild-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "all" }),
      });

      if (!response.ok) throw new Error("Batch rebuild failed");
      const data = await response.json();

      toast({
        title: "批量重建完成",
        description: `成功: ${data.rebuiltCount}, 失败: ${data.failedCount}`,
      });
      fetchStats();
    } catch (error) {
      toast({
        title: "重建失败",
        description: error instanceof Error ? error.message : "批量重建失败",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanup = async () => {
    try {
      setActionLoading("cleanup");
      const response = await fetch("/api/novel/rag/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remove_orphaned: true,
          compact_db: false,
        }),
      });

      if (!response.ok) throw new Error("Cleanup failed");
      const data = await response.json();

      toast({
        title: "清理完成",
        description: `已删除 ${data.deletedCount} 个孤立索引`,
      });
      fetchStats();
    } catch (error) {
      toast({
        title: "清理失败",
        description: error instanceof Error ? error.message : "数据清理失败",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportData = async () => {
    try {
      setActionLoading("export");
      const response = await fetch("/api/novel/rag/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Export failed");
      const data = await response.json();

      window.open(data.downloadUrl, "_blank");
      toast({
        title: "导出成功",
        description: `文件大小: ${(data.size / 1024 / 1024).toFixed(2)} MB`,
      });
    } catch (error) {
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "数据导出失败",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="comic-card border-2 border-zinc-900 dark:border-zinc-600 p-6">
        <p className="text-muted-foreground">正在加载系统概览...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="comic-card border-2 border-zinc-900 dark:border-zinc-600 p-6">
        <p className="text-destructive">加载统计数据失败</p>
      </div>
    );
  }

  const healthScore = stats.indexSuccessRate || 0;
  const healthStatus = healthScore >= 90 ? "优秀" : healthScore >= 70 ? "良好" : "需要优化";

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={<Database className="w-5 h-5" />}
          label="总文档数"
          value={stats.totalDocuments}
          subtitle="章节向量索引"
        />
        <StatsCard
          icon={<Activity className="w-5 h-5" />}
          label="Embedding 模型"
          value={stats.embeddingModel}
          subtitle={`${stats.collectionName} 集合`}
        />
        <StatsCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="索引成功率"
          value={`${healthScore.toFixed(1)}%`}
          subtitle={healthStatus}
          trend={healthScore >= 90 ? "up" : healthScore >= 70 ? "neutral" : "down"}
        />
        <StatsCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="系统状态"
          value={stats.enabled ? "运行中" : "已停用"}
          subtitle={stats.enabled ? "正常服务" : "需要启用"}
        />
      </div>

      {/* Quick Actions */}
      <Card className="comic-card border-2 border-zinc-900 dark:border-zinc-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-500" />
            快速操作
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button
              onClick={handleConsistencyCheck}
              disabled={actionLoading !== null}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white border-2 border-black dark:border-zinc-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${actionLoading === "consistency" ? "animate-spin" : ""}`} />
              一致性检查
            </Button>
            <Button
              onClick={handleBatchRebuild}
              disabled={actionLoading !== null}
              variant="outline"
              className="w-full border-2 border-zinc-900 dark:border-zinc-600"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${actionLoading === "rebuild" ? "animate-spin" : ""}`} />
              批量重建索引
            </Button>
            <Button
              onClick={handleExportData}
              disabled={actionLoading !== null}
              variant="outline"
              className="w-full border-2 border-zinc-900 dark:border-zinc-600"
            >
              <Download className={`w-4 h-4 mr-2 ${actionLoading === "export" ? "animate-spin" : ""}`} />
              导出数据
            </Button>
            <Button
              onClick={handleCleanup}
              disabled={actionLoading !== null}
              variant="outline"
              className="w-full border-2 border-zinc-900 dark:border-zinc-600"
            >
              <Trash2 className={`w-4 h-4 mr-2 ${actionLoading === "cleanup" ? "animate-spin" : ""}`} />
              清理孤立数据
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card className="comic-card border-2 border-zinc-900 dark:border-zinc-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-500" />
            最近索引活动
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">暂无最近活动</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">时间</th>
                    <th className="px-4 py-2 text-left">项目</th>
                    <th className="px-4 py-2 text-left">章节</th>
                    <th className="px-4 py-2 text-left">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivities.map((activity, index) => (
                    <tr key={index} className="border-t border-border">
                      <td className="px-4 py-2">
                        {new Date(activity.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">{activity.projectName}</td>
                      <td className="px-4 py-2">
                        第 {activity.chapterNumber} 章 - {activity.chapterTitle}
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          variant={activity.status === "success" ? "default" : "destructive"}
                          className={
                            activity.status === "success"
                              ? "bg-green-500 hover:bg-green-600"
                              : ""
                          }
                        >
                          {activity.status === "success" ? "成功" : "失败"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewTab;
