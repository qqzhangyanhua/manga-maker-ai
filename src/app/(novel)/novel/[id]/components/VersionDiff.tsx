/**
 * 版本对比组件
 * 使用 react-diff-view 显示两个版本的文本差异
 */
"use client";

import { useMemo } from "react";
import { diffLines, Change } from "diff";
import { parseDiff, Diff, Hunk } from "react-diff-view";
import { Plus, Minus, FileText, AlignLeft, Columns } from "lucide-react";
import type { ChapterVersion } from "../types/version";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { useVersionComparisonStore } from "../stores/versionComparisonStore";
import "react-diff-view/style/index.css";

interface VersionDiffProps {
  version1: ChapterVersion;
  version2: ChapterVersion;
}

/**
 * 格式化 diff 输出为 unified diff 格式
 */
function formatDiff(changes: Change[], v1Number: number, v2Number: number): string {
  const lines: string[] = [
    "--- 版本 " + v1Number,
    "+++ 版本 " + v2Number,
    "@@ -1,1 +1,1 @@",
  ];

  changes.forEach((change) => {
    const prefix = change.added ? "+" : change.removed ? "-" : " ";
    const value = change.value.replace(/\n$/, ""); // 移除末尾换行符
    value.split("\n").forEach((line) => {
      lines.push(prefix + line);
    });
  });

  return lines.join("\n");
}

export function VersionDiff({ version1, version2 }: VersionDiffProps) {
  // 获取视图类型状态
  const { diffViewType, setDiffViewType } = useVersionComparisonStore();

  // Memoize expensive diff computation
  const diffResult = useMemo(() => {
    try {
      // 计算文本差异
      const changes = diffLines(version1.content, version2.content);

      // 格式化为 unified diff 格式
      const unifiedDiff = formatDiff(changes, version1.version_number, version2.version_number);

      // 解析为 react-diff-view 格式
      const [diff] = parseDiff(unifiedDiff, { nearbySequences: "zip" });

      return diff;
    } catch (error) {
      console.error("Diff computation failed:", error);
      return null;
    }
  }, [version1.id, version2.id, version1.content, version2.content, version1.version_number, version2.version_number]);

  // 计算统计信息
  const stats = useMemo(() => {
    if (!diffResult) {
      return { additions: 0, deletions: 0, changes: 0 };
    }

    // 手动计算additions和deletions
    let additions = 0;
    let deletions = 0;

    if (diffResult.hunks) {
      diffResult.hunks.forEach((hunk) => {
        hunk.changes.forEach((change) => {
          if (change.type === "insert") additions++;
          if (change.type === "delete") deletions++;
        });
      });
    }

    return {
      additions,
      deletions,
      changes: additions + deletions,
    };
  }, [diffResult]);

  // Token化已移除,使用基础diff显示即可
  const tokens = undefined;

  if (!diffResult) {
    return (
      <GlassCard className="p-6 bg-zinc-900/40 border-purple-500/10 backdrop-blur-sm">
        <div className="text-center text-zinc-400">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>无法计算版本差异</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* 版本信息头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-red-400">
            <Minus className="h-4 w-4" />
            <span>版本 {version1.version_number}</span>
          </div>
          <div className="text-zinc-600">→</div>
          <div className="flex items-center gap-2 text-green-400">
            <Plus className="h-4 w-4" />
            <span>版本 {version2.version_number}</span>
          </div>
        </div>

        {/* 统计信息 + 视图切换按钮 */}
        <div className="flex items-center gap-4">
          {/* 统计信息 */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-green-400">
              <Plus className="h-3 w-3" />
              <span>{stats.additions} 行新增</span>
            </div>
            <div className="flex items-center gap-2 text-red-400">
              <Minus className="h-3 w-3" />
              <span>{stats.deletions} 行删除</span>
            </div>
            <div className="text-zinc-400">
              共 {stats.changes} 处变更
            </div>
          </div>

          {/* 视图切换按钮 */}
          <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
            <Button
              variant={diffViewType === "unified" ? "default" : "outline"}
              size="sm"
              onClick={() => setDiffViewType("unified")}
              className={
                diffViewType === "unified"
                  ? "h-8 px-3 bg-purple-600 hover:bg-purple-700"
                  : "h-8 px-3 border-zinc-800 hover:bg-zinc-800/50"
              }
            >
              <AlignLeft className="h-3 w-3 mr-1.5" />
              统一视图
            </Button>
            <Button
              variant={diffViewType === "split" ? "default" : "outline"}
              size="sm"
              onClick={() => setDiffViewType("split")}
              className={
                diffViewType === "split"
                  ? "h-8 px-3 bg-purple-600 hover:bg-purple-700"
                  : "h-8 px-3 border-zinc-800 hover:bg-zinc-800/50"
              }
            >
              <Columns className="h-3 w-3 mr-1.5" />
              左右对比
            </Button>
          </div>
        </div>
      </div>

      {/* Diff 视图 */}
      <GlassCard className="p-0 overflow-hidden bg-zinc-900/40 border-purple-500/10 backdrop-blur-sm">
        <div className="diff-container bg-black/20">
          <Diff
            viewType={diffViewType}
            diffType={diffResult.type}
            hunks={diffResult.hunks || []}
            tokens={tokens}
          >
            {(hunks) =>
              hunks.map((hunk) => (
                <Hunk key={hunk.content} hunk={hunk} />
              ))
            }
          </Diff>
        </div>
      </GlassCard>

      {/* 样式覆盖 */}
      <style jsx global>{`
        .diff-container {
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco,
            Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 13px;
        }

        .diff-gutter {
          user-select: none;
          padding: 0 8px;
          width: 60px;
          min-width: 60px;
          background: rgba(0, 0, 0, 0.2);
          border-right: 1px solid rgba(63, 63, 70, 0.5); /* zinc-700/50 */
        }

        .diff-code {
          padding: 0 12px;
          white-space: pre-wrap;
          word-break: break-word;
        }

        /* Unified 视图样式 */
        .diff-line-normal {
          background: transparent;
          color: #d4d4d8; /* zinc-300 */
        }

        .diff-line-insert {
          background: rgba(34, 197, 94, 0.1); /* green-500/10 */
          color: #86efac; /* green-300 */
        }

        .diff-line-delete {
          background: rgba(239, 68, 68, 0.1); /* red-500/10 */
          color: #fca5a5; /* red-300 */
        }

        .diff-line-insert .diff-code-insert {
          background: rgba(34, 197, 94, 0.2); /* green-500/20 */
        }

        .diff-line-delete .diff-code-delete {
          background: rgba(239, 68, 68, 0.2); /* red-500/20 */
        }

        /* Split 视图特定样式 */
        .diff-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-collapse: collapse;
        }

        .diff-split .diff-gutter-col {
          background: rgba(0, 0, 0, 0.2);
        }

        .diff-split .diff-code-col {
          background: transparent;
        }

        /* Split 视图中的删除列 (左侧) */
        .diff-split .diff-gutter-delete,
        .diff-split .diff-code-delete {
          background: rgba(239, 68, 68, 0.08); /* red-500/8 */
          border-right: 1px solid rgba(239, 68, 68, 0.2);
        }

        /* Split 视图中的新增列 (右侧) */
        .diff-split .diff-gutter-insert,
        .diff-split .diff-code-insert {
          background: rgba(34, 197, 94, 0.08); /* green-500/8 */
        }

        /* Split 视图中的高亮文本 */
        .diff-split .diff-code-delete .diff-code-mark {
          background: rgba(239, 68, 68, 0.3); /* red-500/30 */
        }

        .diff-split .diff-code-insert .diff-code-mark {
          background: rgba(34, 197, 94, 0.3); /* green-500/30 */
        }

        /* 空行样式 */
        .diff-gutter-omit {
          background: rgba(63, 63, 70, 0.2); /* zinc-700/20 */
          color: #71717a; /* zinc-500 */
        }
      `}</style>
    </div>
  );
}
