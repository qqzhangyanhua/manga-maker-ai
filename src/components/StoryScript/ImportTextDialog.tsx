/**
 * 导入文本对话框组件
 * 支持粘贴小说文本或上传PDF/TXT文件并自动生成分镜
 */

"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, AlertCircle, CheckCircle2, Upload, File } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ImportTextDialogProps, EstimateData, ImportStage } from "./types";
import { extractTextFromPdf, isPdfFile, validateFileSize, type PdfParseProgress } from "@/lib/pdf-utils";

export function ImportTextDialog({
  open,
  onOpenChange,
  storyId,
  projectId,
  onSuccess,
}: ImportTextDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [text, setText] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseProgress, setParseProgress] = useState<PdfParseProgress | null>(null);
  const [estimate, setEstimate] = useState<EstimateData | null>(null);
  const [stage, setStage] = useState<ImportStage>("input");
  const [generatedChapterId, setGeneratedChapterId] = useState<string | null>(null);

  // 实时预估（debounce）
  useEffect(() => {
    if (!text || text.length < 100 || stage !== "input") {
      setEstimate(null);
      return;
    }

    const timer = setTimeout(() => {
      fetchEstimate(text);
    }, 500);

    return () => clearTimeout(timer);
  }, [text, stage]);

  async function fetchEstimate(content: string) {
    setStage("estimating");

    try {
      const response = await fetch(`/api/story/${storyId}/estimate-import-cost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "预估失败");
      }

      setEstimate(data.estimate);
      setStage("input");
    } catch (error) {
      console.error("Failed to estimate:", error);
      setStage("input");
      toast({
        title: "预估失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const isPdf = isPdfFile(file);
    const isTxt = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");

    if (!isPdf && !isTxt) {
      toast({
        title: "文件格式不支持",
        description: "请上传 PDF 或 TXT 文件",
        variant: "destructive",
      });
      return;
    }

    // 验证文件大小
    if (!validateFileSize(file, 10)) {
      toast({
        title: "文件过大",
        description: "文件大小不能超过 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    try {
      let extractedText = "";

      if (isPdf) {
        // 解析PDF
        setStage("estimating");
        toast({
          title: "正在解析PDF",
          description: "请稍候...",
        });

        const result = await extractTextFromPdf(file, (progress) => {
          setParseProgress(progress);
        });

        extractedText = result.text;

        // 如果PDF有标题元数据，自动填充
        if (result.metadata?.title && !chapterTitle) {
          setChapterTitle(result.metadata.title);
        }

        setParseProgress(null);
        toast({
          title: "PDF解析成功",
          description: `已提取 ${result.pageCount} 页内容，共 ${extractedText.length} 字`,
        });
      } else {
        // 读取TXT文件
        extractedText = await file.text();
      }

      // 清理文本（移除多余空白）
      extractedText = extractedText.replace(/\s+/g, " ").trim();

      setText(extractedText);
      setStage("input");
    } catch (error) {
      console.error("Failed to parse file:", error);
      setSelectedFile(null);
      setParseProgress(null);
      setStage("input");
      toast({
        title: "文件解析失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  }

  async function handleConfirmImport() {
    if (!text.trim()) {
      toast({
        title: "请输入文本内容",
        variant: "destructive",
      });
      return;
    }

    if (estimate && !estimate.hasEnoughCredits) {
      toast({
        title: "积分不足",
        description: `需要 ${estimate.estimatedCredits} 积分，当前余额 ${estimate.currentCredits}`,
        variant: "destructive",
      });
      return;
    }

    setStage("generating");

    try {
      const response = await fetch(`/api/story/${storyId}/import-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          chapterTitle: chapterTitle.trim() || undefined,
          projectId: projectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "导入失败");
      }

      setGeneratedChapterId(data.chapterId);
      setStage("completed");

      toast({
        title: "导入成功",
        description: data.message,
      });
    } catch (error) {
      console.error("Failed to import:", error);
      setStage("input");
      toast({
        title: "导入失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    }
  }

  function handleComplete() {
    if (generatedChapterId) {
      onSuccess(generatedChapterId);
    }
    handleCancel();
  }

  function handleCancel() {
    setText("");
    setChapterTitle("");
    setSelectedFile(null);
    setParseProgress(null);
    setEstimate(null);
    setStage("input");
    setGeneratedChapterId(null);
    setInputMode("paste");
    onOpenChange(false);
  }

  const wordCount = text.length;
  const isInputDisabled = stage === "estimating" || stage === "generating" || stage === "completed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-gray-900 border-gray-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-100 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            导入小说文本
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            粘贴文本或上传 PDF/TXT 文件，系统将自动拆分为漫画分镜
          </DialogDescription>
        </DialogHeader>

        {/* Input Stage */}
        {(stage === "input" || stage === "estimating") && (
          <div className="space-y-4 py-4">
            {/* 输入模式切换 */}
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "paste" | "upload")}>
              <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                <TabsTrigger value="paste" className="data-[state=active]:bg-gray-700">
                  <FileText className="w-4 h-4 mr-2" />
                  粘贴文本
                </TabsTrigger>
                <TabsTrigger value="upload" className="data-[state=active]:bg-gray-700">
                  <Upload className="w-4 h-4 mr-2" />
                  上传文件
                </TabsTrigger>
              </TabsList>

              {/* 粘贴文本模式 */}
              <TabsContent value="paste" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="text" className="text-gray-300">
                    小说内容 *
                  </Label>
                  <Textarea
                    id="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="在此粘贴小说内容...&#10;&#10;例如：&#10;在繁华的都市中心，隐藏着一家神秘的咖啡馆。这家咖啡馆只在午夜开放，只招待有缘人......"
                    rows={12}
                    className="bg-gray-800 border-gray-700 text-gray-100 resize-none font-mono"
                    disabled={isInputDisabled}
                  />
                </div>
              </TabsContent>

              {/* 上传文件模式 */}
              <TabsContent value="upload" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">
                    上传文件 (PDF / TXT)
                  </Label>
                  <div
                    className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-gray-600 transition-colors cursor-pointer bg-gray-800/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt"
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={isInputDisabled}
                    />
                    {selectedFile ? (
                      <div className="space-y-2">
                        <File className="w-12 h-12 mx-auto text-green-500" />
                        <p className="text-gray-200 font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-gray-400">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                        {parseProgress && (
                          <div className="mt-4 space-y-2">
                            <Progress value={parseProgress.percentage} className="h-2" />
                            <p className="text-xs text-gray-400">
                              正在解析... {parseProgress.current} / {parseProgress.total} 页
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-12 h-12 mx-auto text-gray-500" />
                        <p className="text-gray-400">点击上传或拖拽文件到此处</p>
                        <p className="text-xs text-gray-500">
                          支持 PDF 和 TXT 格式，最大 10MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 如果已提取文本，显示预览 */}
                {text && (
                  <div className="space-y-2">
                    <Label className="text-gray-300">
                      提取的文本预览
                    </Label>
                    <div className="bg-gray-800 border border-gray-700 rounded p-3 max-h-40 overflow-y-auto">
                      <p className="text-sm text-gray-400 font-mono whitespace-pre-wrap">
                        {text.substring(0, 500)}
                        {text.length > 500 && "..."}
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* 统计信息 */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                字数：{wordCount} / 10,000
              </span>
              {stage === "estimating" && (
                <span className="text-orange-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  预估中...
                </span>
              )}
            </div>

            {/* 预估信息 */}
            {estimate && stage === "input" && (
              <Alert className={estimate.hasEnoughCredits ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"}>
                {estimate.hasEnoughCredits ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <AlertDescription className="ml-2">
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">预计生成分镜：</span>
                        <span className="ml-2 font-semibold text-gray-200">{estimate.estimatedPanels} 个</span>
                      </div>
                      <div>
                        <span className="text-gray-400">消耗积分：</span>
                        <span className="ml-2 font-semibold text-gray-200">{estimate.estimatedCredits}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">当前余额：</span>
                        <span className={`ml-2 font-semibold ${estimate.hasEnoughCredits ? "text-green-400" : "text-red-400"}`}>
                          {estimate.currentCredits}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">积分充足：</span>
                        <span className={`ml-2 font-semibold ${estimate.hasEnoughCredits ? "text-green-400" : "text-red-400"}`}>
                          {estimate.hasEnoughCredits ? "是" : "否"}
                        </span>
                      </div>
                    </div>
                    {estimate.warning && (
                      <p className="text-orange-400 text-sm mt-2">
                        ⚠️ {estimate.warning}
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* 可选配置 */}
            <div className="space-y-2">
              <Label htmlFor="chapterTitle" className="text-gray-300">
                章节标题（可选）
              </Label>
              <Input
                id="chapterTitle"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                placeholder="例如：第一章 命运的邂逅"
                className="bg-gray-800 border-gray-700 text-gray-100"
                disabled={isInputDisabled}
              />
            </div>
          </div>
        )}

        {/* Generating Stage */}
        {stage === "generating" && (
          <div className="space-y-6 py-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  正在生成分镜...
                </h3>
                <p className="text-sm text-gray-400">
                  AI 正在分析您的文本并生成分镜脚本，请稍候
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Completed Stage */}
        {stage === "completed" && (
          <div className="space-y-6 py-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-500/20 p-3">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  导入成功！
                </h3>
                <p className="text-sm text-gray-400">
                  文本已成功导入并生成分镜，点击"查看分镜"前往编辑
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {stage === "completed" ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-gray-700 text-gray-400"
              >
                关闭
              </Button>
              <Button
                onClick={handleComplete}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                查看分镜
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isInputDisabled}
                className="border-gray-700 text-gray-400"
              >
                取消
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={
                  !text.trim() ||
                  isInputDisabled ||
                  (estimate !== null && !estimate.hasEnoughCredits)
                }
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {stage === "generating" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中
                  </>
                ) : (
                  "开始生成分镜"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
