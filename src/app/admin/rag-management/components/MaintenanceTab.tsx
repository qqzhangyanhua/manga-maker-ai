"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Upload,
  RefreshCw,
  Trash2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MaintenanceLog } from "../types";

const MaintenanceTab: React.FC = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Export/Import state
  const [exportProjectId, setExportProjectId] = useState<string>("all");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);

  // Rebuild state
  const [rebuildScope, setRebuildScope] = useState<"all" | "project">("all");
  const [rebuildProjectId, setRebuildProjectId] = useState<string>("");
  const [showRebuildConfirm, setShowRebuildConfirm] = useState(false);

  // Cleanup state
  const [cleanupOptions, setCleanupOptions] = useState({
    remove_orphaned: true,
    compact_db: false,
  });
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch("/api/novel/rag/maintenance-logs?limit=20");
      if (!response.ok) throw new Error("Failed to fetch logs");
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "获取日志失败",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = async () => {
    try {
      setActionLoading("export");
      const response = await fetch("/api/novel/rag/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: exportProjectId === "all" ? undefined : exportProjectId,
        }),
      });

      if (!response.ok) throw new Error("Export failed");
      const data = await response.json();

      window.open(data.downloadUrl, "_blank");
      toast({
        title: "导出成功",
        description: `文件大小: ${(data.size / 1024 / 1024).toFixed(2)} MB`,
      });
      fetchLogs();
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

  const handleImport = async () => {
    if (!importFile) return;

    try {
      setActionLoading("import");
      const formData = new FormData();
      formData.append("file", importFile);

      const response = await fetch("/api/novel/rag/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Import failed");
      const data = await response.json();

      toast({
        title: "导入成功",
        description: `导入 ${data.importedCount} 条记录，跳过 ${data.skippedCount} 条`,
      });
      setImportFile(null);
      setShowImportConfirm(false);
      fetchLogs();
    } catch (error) {
      toast({
        title: "导入失败",
        description: error instanceof Error ? error.message : "数据导入失败",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRebuild = async () => {
    try {
      setActionLoading("rebuild");
      const response = await fetch("/api/novel/rag/rebuild-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: rebuildScope,
          project_id: rebuildScope === "project" ? rebuildProjectId : undefined,
        }),
      });

      if (!response.ok) throw new Error("Rebuild failed");
      const data = await response.json();

      toast({
        title: "重建任务已创建",
        description: `预计处理 ${data.estimatedCount} 个章节`,
      });
      setShowRebuildConfirm(false);
      fetchLogs();
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
        body: JSON.stringify(cleanupOptions),
      });

      if (!response.ok) throw new Error("Cleanup failed");
      const data = await response.json();

      toast({
        title: "清理完成",
        description: `删除 ${data.deletedCount} 条记录，释放 ${data.spaceFree?.toFixed(2) || 0} MB 空间`,
      });
      setShowCleanupConfirm(false);
      fetchLogs();
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500 hover:bg-green-600">成功</Badge>;
      case "failed":
        return <Badge variant="destructive">失败</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">部分成功</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Export/Import Section */}
      <Card className="comic-card border-2 border-zinc-900 dark:border-zinc-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-500" />
            数据导出 / 导入
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">导出向量数据</Label>
            <div className="flex gap-3">
              <Select value={exportProjectId} onValueChange={setExportProjectId}>
                <SelectTrigger className="flex-1 border-2 border-zinc-900 dark:border-zinc-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部项目</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleExport}
                disabled={actionLoading !== null}
                className="bg-purple-500 hover:bg-purple-600 text-white border-2 border-black dark:border-zinc-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <Download className={`w-4 h-4 mr-2 ${actionLoading === "export" ? "animate-pulse" : ""}`} />
                导出数据
              </Button>
            </div>
          </div>

          <div className="border-t pt-6" />

          {/* Import */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">导入向量数据</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="border-2 border-zinc-900 dark:border-zinc-600"
                />
                <Button
                  onClick={() => setShowImportConfirm(true)}
                  disabled={!importFile || actionLoading !== null}
                  variant="outline"
                  className="border-2 border-zinc-900 dark:border-zinc-600"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  导入
                </Button>
              </div>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                导入将覆盖现有数据，请谨慎操作
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Rebuild Section */}
      <Card className="comic-card border-2 border-zinc-900 dark:border-zinc-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-purple-500" />
            批量重建索引
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>重建范围</Label>
            <Select value={rebuildScope} onValueChange={(v) => setRebuildScope(v as "all" | "project")}>
              <SelectTrigger className="border-2 border-zinc-900 dark:border-zinc-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部索引</SelectItem>
                <SelectItem value="project">指定项目</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {rebuildScope === "project" && (
            <div className="space-y-3">
              <Label>项目 ID</Label>
              <Input
                value={rebuildProjectId}
                onChange={(e) => setRebuildProjectId(e.target.value)}
                placeholder="输入项目 ID"
                className="border-2 border-zinc-900 dark:border-zinc-600"
              />
            </div>
          )}
          <Button
            onClick={() => setShowRebuildConfirm(true)}
            disabled={actionLoading !== null || (rebuildScope === "project" && !rebuildProjectId)}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white border-2 border-black dark:border-zinc-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            开始重建索引
          </Button>
        </CardContent>
      </Card>

      {/* Cleanup Section */}
      <Card className="comic-card border-2 border-zinc-900 dark:border-zinc-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-purple-500" />
            数据清理工具
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="cleanup-orphaned"
                checked={cleanupOptions.remove_orphaned}
                onCheckedChange={(checked) =>
                  setCleanupOptions((prev) => ({ ...prev, remove_orphaned: checked as boolean }))
                }
              />
              <Label htmlFor="cleanup-orphaned" className="cursor-pointer">
                清理孤立索引
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="cleanup-cache"
                checked={cleanupOptions.compact_db}
                onCheckedChange={(checked) =>
                  setCleanupOptions((prev) => ({ ...prev, compact_db: checked as boolean }))
                }
              />
              <Label htmlFor="cleanup-cache" className="cursor-pointer">
                清理过期缓存
              </Label>
            </div>
          </div>
          <Button
            onClick={() => setShowCleanupConfirm(true)}
            disabled={actionLoading !== null || (!cleanupOptions.remove_orphaned && !cleanupOptions.compact_db)}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            执行选中的清理操作
          </Button>
        </CardContent>
      </Card>

      {/* Maintenance Logs */}
      <Card className="comic-card border-2 border-zinc-900 dark:border-zinc-600">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              系统维护日志
            </span>
            <Button
              onClick={fetchLogs}
              disabled={loading}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">暂无维护日志</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>操作类型</TableHead>
                  <TableHead>详情</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {log.operation === "export" && "导出"}
                        {log.operation === "import" && "导入"}
                        {log.operation === "rebuild" && "重建"}
                        {log.operation === "cleanup" && "清理"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{log.details}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Import Confirmation Dialog */}
      <AlertDialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认导入数据</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>即将导入文件: {importFile?.name}</p>
                <p className="text-yellow-600 dark:text-yellow-400 font-semibold">
                  警告: 此操作将覆盖现有的向量数据，无法撤销
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading === "import"}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImport}
              disabled={actionLoading === "import"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading === "import" ? "导入中..." : "确认导入"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rebuild Confirmation Dialog */}
      <AlertDialog open={showRebuildConfirm} onOpenChange={setShowRebuildConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量重建索引</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>
                  重建范围: {rebuildScope === "all" ? "全部索引" : `项目 ${rebuildProjectId}`}
                </p>
                <p className="text-yellow-600 dark:text-yellow-400">
                  此操作可能耗时较长，建议在低峰期执行
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading === "rebuild"}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRebuild}
              disabled={actionLoading === "rebuild"}
            >
              {actionLoading === "rebuild" ? "执行中..." : "确认重建"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cleanup Confirmation Dialog */}
      <AlertDialog open={showCleanupConfirm} onOpenChange={setShowCleanupConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认数据清理</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>将执行以下清理操作:</p>
                <ul className="list-disc list-inside">
                  {cleanupOptions.remove_orphaned && <li>清理孤立索引</li>}
                  {cleanupOptions.compact_db && <li>清理过期缓存</li>}
                </ul>
                <p className="text-red-600 dark:text-red-400 font-semibold">
                  此操作不可撤销
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading === "cleanup"}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCleanup}
              disabled={actionLoading === "cleanup"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading === "cleanup" ? "清理中..." : "确认清理"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MaintenanceTab;
