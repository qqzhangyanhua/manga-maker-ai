"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star, Check, X, Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";

interface ChapterVersion {
  id: string;
  version_number: number;
  content: string;
  word_count: number;
  model_used: string | null;
  temperature: number | null;
  is_selected: boolean;
  user_rating: number | null;
  notes: string | null;
  created_at: string;
}

interface VersionCompareProps {
  chapterId: string;
  versions: ChapterVersion[];
  onGenerate: (count: number) => Promise<void>;
  onSelect: (versionId: string) => Promise<void>;
  onRate: (versionId: string, rating: number) => Promise<void>;
  onClose: () => void;
}

export function VersionCompare({
  chapterId,
  versions,
  onGenerate,
  onSelect,
  onRate,
  onClose,
}: VersionCompareProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(3);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    versions.find((v) => v.is_selected)?.id || null
  );

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate(generateCount);
      toast.success(`已生成 ${generateCount} 个版本`);
    } catch (error) {
      toast.error("生成失败");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelect = async (versionId: string) => {
    try {
      await onSelect(versionId);
      setSelectedVersionId(versionId);
      toast.success("已选择该版本");
    } catch (error) {
      toast.error("选择失败");
      console.error(error);
    }
  };

  const handleRate = async (versionId: string, rating: number) => {
    try {
      await onRate(versionId, rating);
      toast.success("评分已保存");
    } catch (error) {
      toast.error("评分失败");
      console.error(error);
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("已复制到剪贴板");
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>版本对比与选择</span>
            <div className="flex items-center gap-2">
              <select
                value={generateCount}
                onChange={(e) => setGenerateCount(Number(e.target.value))}
                className="rounded-md border px-3 py-1 text-sm"
              >
                <option value={2}>生成 2 个版本</option>
                <option value={3}>生成 3 个版本</option>
                <option value={5}>生成 5 个版本</option>
              </select>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                size="sm"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isGenerating ? "生成中..." : "AI 生成"}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {versions.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              还没有生成任何版本
            </p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              <Sparkles className="mr-2 h-4 w-4" />
              开始生成
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {versions.map((version) => (
              <Card
                key={version.id}
                className={
                  version.id === selectedVersionId
                    ? "border-green-500 border-2"
                    : ""
                }
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge>版本 {version.version_number}</Badge>
                      {version.is_selected && (
                        <Badge variant="default" className="bg-green-500">
                          <Check className="mr-1 h-3 w-3" />
                          当前版本
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => handleRate(version.id, rating)}
                          className="hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              version.user_rating &&
                              rating <= version.user_rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <span>{version.word_count} 字</span>
                    {version.model_used && <span>{version.model_used}</span>}
                    {version.temperature && (
                      <span>温度 {version.temperature}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="max-h-64 overflow-y-auto">
                    <Textarea
                      value={version.content}
                      readOnly
                      className="min-h-[200px] text-sm"
                    />
                  </div>
                  {version.notes && (
                    <p className="text-xs text-muted-foreground italic">
                      备注：{version.notes}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSelect(version.id)}
                      disabled={version.is_selected}
                      size="sm"
                      className="flex-1"
                    >
                      {version.is_selected ? (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          已选择
                        </>
                      ) : (
                        "选择此版本"
                      )}
                    </Button>
                    <Button
                      onClick={() => copyToClipboard(version.content)}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
