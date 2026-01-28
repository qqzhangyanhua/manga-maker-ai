/**
 * AI 世界观提取对话框
 * 从章节中提取地点、人物、事件、物品、规则和伏笔
 */
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Sparkles,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { worldService } from "../../services/worldService";
import {
  EntryType,
  ExtractedEntry,
  ExtractionProgressEvent,
  ExtractionEntryEvent,
  ExtractionCompleteEvent,
  ENTRY_TYPE_CONFIG,
} from "../../types/world";
import { ExtractedEntryCard, ExtractedEntryCardSkeleton } from "./ExtractedEntryCard";
import type { NovelChapter } from "../../types";

interface ExtractedEntryWithMeta {
  entry: ExtractedEntry;
  chapterId: number;
  isDuplicate: boolean;
  similarEntryName?: string;
}

interface ExtractWorldEntriesDialogProps {
  projectId: string;
  chapters: NovelChapter[];  // ✅ 直接接收章节列表，不再自己调用接口
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ExtractionPhase = "idle" | "extracting" | "complete" | "error";

const ENTRY_TYPES: EntryType[] = ["location", "character", "event", "item", "rule", "foreshadowing"];

export function ExtractWorldEntriesDialog({
  projectId,
  chapters,  // ✅ 接收章节数据
  open,
  onOpenChange,
  onSuccess,
}: ExtractWorldEntriesDialogProps) {
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<EntryType[]>([...ENTRY_TYPES]);
  const [chaptersExpanded, setChaptersExpanded] = useState(true);
  const [typesExpanded, setTypesExpanded] = useState(true);

  const [phase, setPhase] = useState<ExtractionPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [extractedEntries, setExtractedEntries] = useState<ExtractedEntryWithMeta[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<{ total: number; byType: Record<string, number>; duplicates: number } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // ✅ 调试：检查接收的 chapters（仅在对话框打开时）
  useEffect(() => {
    if (open && process.env.NODE_ENV === "development") {
      console.log("[ExtractWorldEntriesDialog] Dialog opened with chapters:", {
        count: chapters?.length || 0,
        hasContent: chapters?.filter(ch => ch.content && ch.content.trim().length > 0).length || 0,
        chaptersPreview: chapters?.slice(0, 2).map(ch => ({
          id: ch.id,
          number: ch.chapter_number,
          title: ch.title,
          hasContent: !!ch.content,
          contentLength: ch.content?.length || 0,
        })),
      });
    }
  }, [open, chapters]);

  // ✅ 优先显示有正文的章节（提取效果更好）
  // 也包含只有大纲的章节，但会标记提示
  const chaptersWithContent = chapters.filter((ch) => ch.content && ch.content.trim().length > 0);
  const chaptersWithOutlineOnly = chapters.filter((ch) => (!ch.content || ch.content.trim().length === 0) && ch.outline);
  const availableChapters = [...chaptersWithContent, ...chaptersWithOutlineOnly];

  const resetState = useCallback(() => {
    setPhase("idle");
    setProgress(0);
    setProgressMessage("");
    setExtractedEntries([]);
    setSelectedEntries(new Set());
    setStats(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  const handleChapterToggle = (chapterNumber: number) => {
    setSelectedChapters((prev) =>
      prev.includes(chapterNumber)
        ? prev.filter((n) => n !== chapterNumber)
        : [...prev, chapterNumber]
    );
  };

  const handleSelectAllChapters = () => {
    if (selectedChapters.length === availableChapters.length) {
      setSelectedChapters([]);
    } else {
      setSelectedChapters(availableChapters.map((ch) => ch.chapter_number));
    }
  };

  const handleTypeToggle = (type: EntryType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSelectAllTypes = () => {
    if (selectedTypes.length === ENTRY_TYPES.length) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes([...ENTRY_TYPES]);
    }
  };

  const handleEntryToggle = (index: number, selected: boolean) => {
    setSelectedEntries((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  };

  const handleSelectAllEntries = () => {
    if (selectedEntries.size === extractedEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(extractedEntries.map((_, i) => i)));
    }
  };

  const handleExtract = async () => {
    if (selectedChapters.length === 0 || selectedTypes.length === 0) {
      toast.error("请至少选择一个章节和一种条目类型");
      return;
    }

    setPhase("extracting");
    setProgress(0);
    setProgressMessage("正在准备提取...");
    setExtractedEntries([]);
    setSelectedEntries(new Set());

    abortControllerRef.current = new AbortController();

    try {
      const stream = worldService.extractEntriesStream(
        projectId,
        {
          project_id: projectId,
          chapter_ids: selectedChapters,
          entry_types: selectedTypes,
          min_confidence: 0.5,
        },
        abortControllerRef.current.signal
      );

      for await (const { event, data } of stream) {
        if (event === "progress") {
          const progressData = data as ExtractionProgressEvent;
          setProgress(progressData.progress * 100);
          setProgressMessage(progressData.message || "");
        } else if (event === "entry") {
          const entryData = data as ExtractionEntryEvent;
          setExtractedEntries((prev) => [
            ...prev,
            {
              entry: entryData.entry,
              chapterId: entryData.chapter_id,
              isDuplicate: entryData.is_duplicate,
              similarEntryName: entryData.similar_entry_name,
            },
          ]);
          setSelectedEntries((prev) => {
            if (!entryData.is_duplicate) {
              const next = new Set(prev);
              next.add(prev.size);
              return next;
            }
            return prev;
          });
        } else if (event === "complete") {
          const completeData = data as ExtractionCompleteEvent;
          setStats({
            total: completeData.total_extracted,
            byType: completeData.by_type,
            duplicates: completeData.duplicates_found,
          });
          setPhase("complete");
          setProgress(100);
        } else if (event === "error") {
          const errorData = data as { message: string };
          toast.error(errorData.message);
          setPhase("error");
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        toast.info("提取已取消");
        setPhase("idle");
      } else {
        const message = err instanceof Error ? err.message : "提取失败";
        toast.error(message);
        setPhase("error");
      }
    }
  };

  const handleSave = async () => {
    const entriesToSave = extractedEntries
      .filter((_, i) => selectedEntries.has(i))
      .map((e) => e.entry);

    if (entriesToSave.length === 0) {
      toast.error("请至少选择一个条目保存");
      return;
    }

    try {
      const result = await worldService.batchSaveExtractedEntries(projectId, {
        project_id: projectId,
        entries: entriesToSave,
      });

      if (result.saved_count > 0) {
        toast.success(`成功保存 ${result.saved_count} 个条目`);
        onSuccess?.();
        onOpenChange(false);
      }

      if (result.failed_count > 0) {
        toast.warning(`${result.failed_count} 个条目保存失败`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存失败";
      toast.error(message);
    }
  };

  const handleCancel = () => {
    if (phase === "extracting") {
      abortControllerRef.current?.abort();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI 世界观提取
          </DialogTitle>
          <DialogDescription>
            从章节中自动提取地点、人物、事件、物品、规则和伏笔
            <br />
            <span className="text-xs text-purple-400">
              💡 提示：建议选择已完成章节（有正文内容）以获得更好的提取效果
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          {phase === "idle" && (
            <>
              <Collapsible open={chaptersExpanded} onOpenChange={setChaptersExpanded}>
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 p-0 h-auto">
                      {chaptersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      选择章节
                    </Button>
                  </CollapsibleTrigger>
                  <Button variant="link" size="sm" onClick={handleSelectAllChapters}>
                    {selectedChapters.length === availableChapters.length ? "取消全选" : "全选"}
                  </Button>
                </div>
                <CollapsibleContent>
                  <ScrollArea className="h-[150px] mt-2 border rounded-md p-2">
                    {availableChapters.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                        暂无已完成的章节
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* 有正文的章节（推荐） */}
                        {chaptersWithContent.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground px-2">
                              已完成章节（推荐提取）
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {chaptersWithContent.map((ch) => (
                                <label
                                  key={ch.id}
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted",
                                    selectedChapters.includes(ch.chapter_number) && "bg-muted"
                                  )}
                                >
                                  <Checkbox
                                    checked={selectedChapters.includes(ch.chapter_number)}
                                    onCheckedChange={() => handleChapterToggle(ch.chapter_number)}
                                  />
                                  <span className="text-sm truncate flex-1">
                                    第 {ch.chapter_number} 章: {ch.title}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {ch.word_count}字
                                  </Badge>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 只有大纲的章节（提取效果有限） */}
                        {chaptersWithOutlineOnly.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground px-2">
                              仅有大纲（提取信息有限）
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {chaptersWithOutlineOnly.map((ch) => (
                                <label
                                  key={ch.id}
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted opacity-60",
                                    selectedChapters.includes(ch.chapter_number) && "bg-muted opacity-100"
                                  )}
                                >
                                  <Checkbox
                                    checked={selectedChapters.includes(ch.chapter_number)}
                                    onCheckedChange={() => handleChapterToggle(ch.chapter_number)}
                                  />
                                  <span className="text-sm truncate flex-1">
                                    第 {ch.chapter_number} 章: {ch.title}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    仅大纲
                                  </Badge>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible open={typesExpanded} onOpenChange={setTypesExpanded}>
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 p-0 h-auto">
                      {typesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      选择条目类型
                    </Button>
                  </CollapsibleTrigger>
                  <Button variant="link" size="sm" onClick={handleSelectAllTypes}>
                    {selectedTypes.length === ENTRY_TYPES.length ? "取消全选" : "全选"}
                  </Button>
                </div>
                <CollapsibleContent>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ENTRY_TYPES.map((type) => {
                      const config = ENTRY_TYPE_CONFIG[type];
                      return (
                        <label
                          key={type}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors",
                            selectedTypes.includes(type)
                              ? "border-primary bg-primary/10"
                              : "hover:bg-muted"
                          )}
                        >
                          <Checkbox
                            checked={selectedTypes.includes(type)}
                            onCheckedChange={() => handleTypeToggle(type)}
                            className="hidden"
                          />
                          <span className="text-sm">{config.label}</span>
                          {selectedTypes.includes(type) && <Check className="h-3 w-3" />}
                        </label>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {phase === "extracting" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{progressMessage}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {extractedEntries.map((item, index) => (
                    <ExtractedEntryCard
                      key={index}
                      entry={item.entry}
                      chapterId={item.chapterId}
                      isDuplicate={item.isDuplicate}
                      similarEntryName={item.similarEntryName}
                      isSelected={selectedEntries.has(index)}
                      onToggleSelect={(selected) => handleEntryToggle(index, selected)}
                    />
                  ))}
                  {phase === "extracting" && <ExtractedEntryCardSkeleton />}
                </div>
              </ScrollArea>
            </div>
          )}

          {(phase === "complete" || phase === "error") && (
            <div className="space-y-4">
              {stats && (
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge variant="secondary">提取 {stats.total} 个条目</Badge>
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <Badge key={type} variant="outline">
                      {ENTRY_TYPE_CONFIG[type as EntryType]?.label || type}: {count}
                    </Badge>
                  ))}
                  {stats.duplicates > 0 && (
                    <Badge variant="destructive">
                      {stats.duplicates} 个重复
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  已选择 {selectedEntries.size} / {extractedEntries.length} 个条目
                </span>
                <Button variant="link" size="sm" onClick={handleSelectAllEntries}>
                  {selectedEntries.size === extractedEntries.length ? "取消全选" : "全选非重复"}
                </Button>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {extractedEntries.map((item, index) => (
                    <ExtractedEntryCard
                      key={index}
                      entry={item.entry}
                      chapterId={item.chapterId}
                      isDuplicate={item.isDuplicate}
                      similarEntryName={item.similarEntryName}
                      isSelected={selectedEntries.has(index)}
                      onToggleSelect={(selected) => handleEntryToggle(index, selected)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {phase === "error" && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>提取过程中发生错误，请重试</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {phase === "extracting" ? "取消提取" : "关闭"}
          </Button>

          {phase === "idle" && (
            <Button
              onClick={handleExtract}
              disabled={selectedChapters.length === 0 || selectedTypes.length === 0}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              开始提取
            </Button>
          )}

          {(phase === "complete" || phase === "error") && (
            <>
              <Button variant="outline" onClick={resetState}>
                重新提取
              </Button>
              <Button onClick={handleSave} disabled={selectedEntries.size === 0}>
                <Save className="h-4 w-4 mr-2" />
                保存选中 ({selectedEntries.size})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
