"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Database,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConsistencyCheckResult } from "../types";

const QualityMonitoringTab: React.FC = () => {
  const { toast } = useToast();
  const [checkResult, setCheckResult] = useState<ConsistencyCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

  const runConsistencyCheck = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/novel/rag/consistency-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Consistency check failed");
      const data = await response.json();

      setCheckResult(data);
      setLastCheckTime(new Date().toLocaleString());

      toast({
        title: "检查完成",
        description: `健康分数: ${data.healthScore.toFixed(1)}/100`,
      });
    } catch (error) {
      toast({
        title: "检查失败",
        description: error instanceof Error ? error.message : "一致性检查失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIndexSelected = async (chapterIds: string[]) => {
    try {
      setActionLoading("index");
      const response = await fetch("/api/novel/rag/rebuild-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "all" }),
      });

      if (!response.ok) throw new Error("Index failed");
      const data = await response.json();

      toast({
        title: "索引完成",
        description: `成功: ${data.rebuiltCount}, 失败: ${data.failedCount}`,
      });
      runConsistencyCheck();
    } catch (error) {
      toast({
        title: "索引失败",
        description: error instanceof Error ? error.message : "批量索引失败",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanupOrphans = async () => {
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
      runConsistencyCheck();
    } catch (error) {
      toast({
        title: "清理失败",
        description: error instanceof Error ? error.message : "清理失败",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRebuildSelected = async (chapterIds: string[]) => {
    try {
      setActionLoading("rebuild");
      const response = await fetch("/api/novel/rag/rebuild-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "all" }),
      });

      if (!response.ok) throw new Error("Rebuild failed");
      const data = await response.json();

      toast({
        title: "重建完成",
        description: `成功: ${data.rebuiltCount}, 失败: ${data.failedCount}`,
      });
      runConsistencyCheck();
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

  const needsProcessing =
    (checkResult?.notIndexed.length || 0) +
    (checkResult?.orphaned.length || 0) +
    (checkResult?.needRebuild.length || 0);

  return (
    <div className="space-y-6">
      {/* Operation Bar */}
      <Card className="comic-card border-2 border-zinc-900 dark:border-zinc-600">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold">数据质量检查</h3>
              {lastCheckTime && (
                <p className="text-sm text-muted-foreground">
                  最后检查: {lastCheckTime}
                </p>
              )}
            </div>
            <Button
              onClick={runConsistencyCheck}
              disabled={loading}
              className="bg-purple-500 hover:bg-purple-600 text-white border-2 border-black dark:border-zinc-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              运行一致性检查
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Health Dashboard */}
      {checkResult && (
        <>
          <Card className="comic-card border-2 border-zinc-900 dark:border-zinc-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                系统健康度评分
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-bold">
                    {checkResult.healthScore.toFixed(1)} / 100
                  </span>
                  <Badge
                    className={
                      checkResult.healthScore >= 90
                        ? "bg-green-500"
                        : checkResult.healthScore >= 70
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }
                  >
                    {checkResult.healthScore >= 90
                      ? "优秀"
                      : checkResult.healthScore >= 70
                      ? "良好"
                      : "需要优化"}
                  </Badge>
                </div>
                <Progress value={checkResult.healthScore} className="h-3" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">已索引章节</p>
                    <p className="text-2xl font-bold">{checkResult.totalInChroma}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">需要处理</p>
                    <p className="text-2xl font-bold">{needsProcessing}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Not Indexed Chapters */}
          {checkResult.notIndexed.length > 0 && (
            <Card className="comic-card border-2 border-zinc-900 dark:border-zinc-600">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    未索引章节 ({checkResult.notIndexed.length})
                  </span>
                  <Button
                    onClick={() =>
                      handleIndexSelected(checkResult.notIndexed.map((c) => c.chapterId))
                    }
                    disabled={actionLoading !== null}
                    size="sm"
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    索引全部
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>项目名</TableHead>
                      <TableHead>章节号</TableHead>
                      <TableHead>标题</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkResult.notIndexed.slice(0, 10).map((chapter) => (
                      <TableRow key={chapter.chapterId}>
                        <TableCell>{chapter.projectName}</TableCell>
                        <TableCell>第 {chapter.chapterNumber} 章</TableCell>
                        <TableCell>{chapter.title}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {checkResult.notIndexed.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    还有 {checkResult.notIndexed.length - 10} 个章节未显示
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Orphaned Indexes */}
          {checkResult.orphaned.length > 0 && (
            <Card className="comic-card border-2 border-zinc-900 dark:border-zinc-600">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-yellow-500" />
                    孤立索引 ({checkResult.orphaned.length})
                  </span>
                  <Button
                    onClick={handleCleanupOrphans}
                    disabled={actionLoading !== null}
                    size="sm"
                    variant="destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    清理全部
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  这些索引在向量数据库中存在，但对应的章节已被删除
                </p>
                <div className="space-y-2">
                  {checkResult.orphaned.slice(0, 5).map((id) => (
                    <div
                      key={id}
                      className="p-2 bg-muted rounded text-sm font-mono"
                    >
                      {id}
                    </div>
                  ))}
                </div>
                {checkResult.orphaned.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    还有 {checkResult.orphaned.length - 5} 个孤立索引未显示
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Need Rebuild */}
          {checkResult.needRebuild.length > 0 && (
            <Card className="comic-card border-2 border-zinc-900 dark:border-zinc-600">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-yellow-500" />
                    需要重建的索引 ({checkResult.needRebuild.length})
                  </span>
                  <Button
                    onClick={() =>
                      handleRebuildSelected(checkResult.needRebuild.map((c) => c.chapterId))
                    }
                    disabled={actionLoading !== null}
                    size="sm"
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重建全部
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>项目名</TableHead>
                      <TableHead>章节号</TableHead>
                      <TableHead>标题</TableHead>
                      <TableHead>更新时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkResult.needRebuild.slice(0, 10).map((chapter) => (
                      <TableRow key={chapter.chapterId}>
                        <TableCell>{chapter.projectName}</TableCell>
                        <TableCell>第 {chapter.chapterNumber} 章</TableCell>
                        <TableCell>{chapter.title}</TableCell>
                        <TableCell>
                          {new Date(chapter.updatedAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {checkResult.needRebuild.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    还有 {checkResult.needRebuild.length - 10} 个章节未显示
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* All Good Message */}
          {needsProcessing === 0 && (
            <Card className="comic-card border-2 border-zinc-900 dark:border-zinc-600 bg-green-50 dark:bg-green-950">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <div>
                    <h3 className="font-semibold text-green-700 dark:text-green-300">
                      数据质量良好
                    </h3>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      所有章节索引状态正常，无需处理
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty State */}
      {!checkResult && !loading && (
        <Card className="comic-card border-2 border-zinc-900 dark:border-zinc-600">
          <CardContent className="pt-12 pb-12 text-center">
            <Database className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">尚未进行质量检查</h3>
            <p className="text-muted-foreground mb-6">
              点击上方按钮运行一致性检查，系统将分析数据质量并给出优化建议
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QualityMonitoringTab;
