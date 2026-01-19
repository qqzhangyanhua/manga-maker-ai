/**
 * 世界观条目表单
 */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Plus, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { worldService } from "../../services/worldService";
import {
  WorldEntry,
  EntryType,
  CreateEntryRequest,
  UpdateEntryRequest,
  ENTRY_TYPE_CONFIG,
  ForeshadowingSuggestion,
} from "../../types/world";

interface EntryFormProps {
  projectId: string;
  entry?: WorldEntry | null;
  defaultType?: EntryType;
  onSave: () => void;
  onCancel: () => void;
}

export function EntryForm({ projectId, entry, defaultType, onSave, onCancel }: EntryFormProps) {
  const isEditing = !!entry?.id;
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // 表单状态
  const [type, setType] = useState<EntryType>(entry?.type || defaultType || "location");
  const [name, setName] = useState(entry?.name || "");
  const [description, setDescription] = useState(entry?.description || "");
  const [tags, setTags] = useState<string[]>(entry?.tags || []);
  const [tagInput, setTagInput] = useState("");

  // 伏笔专用字段
  const [plantedChapter, setPlantedChapter] = useState<number | undefined>(
    entry?.planted_chapter || undefined
  );
  const [plannedRevealChapter, setPlannedRevealChapter] = useState<number | undefined>(
    entry?.planned_reveal_chapter || undefined
  );
  const [hintText, setHintText] = useState(entry?.hint_text || "");

  // 动态属性
  const [properties, setProperties] = useState<Record<string, string>>(
    entry?.properties || {}
  );

  // 当类型改变时重置属性
  useEffect(() => {
    if (!isEditing) {
      setProperties({});
    }
  }, [type, isEditing]);

  // 添加标签
  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  // 移除标签
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // 更新属性
  const handlePropertyChange = (key: string, value: string) => {
    setProperties({ ...properties, [key]: value });
  };

  // AI 生成伏笔
  const handleGenerateForeshadowing = async () => {
    setGenerating(true);
    try {
      const response = await worldService.generateForeshadowing(projectId, {
        count: 1,
      });

      if (response.suggestions.length > 0) {
        const suggestion = response.suggestions[0];
        applyForeshadowingSuggestion(suggestion);
        toast.success("AI 已生成伏笔建议，请确认后保存");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "生成失败";
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  // 应用伏笔建议到表单
  const applyForeshadowingSuggestion = (suggestion: ForeshadowingSuggestion) => {
    setName(suggestion.name);
    setDescription(suggestion.description);
    setHintText(suggestion.hint_text);
    setPlantedChapter(suggestion.planted_chapter);
    setPlannedRevealChapter(suggestion.planned_reveal_chapter);
    if (suggestion.properties) {
      setProperties(suggestion.properties);
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("请输入条目名称");
      return;
    }

    if (type === "foreshadowing" && !plantedChapter) {
      toast.error("伏笔必须指定埋设章节");
      return;
    }

    setLoading(true);

    try {
      if (isEditing) {
        const updateData: UpdateEntryRequest = {
          name: name.trim(),
          description: description.trim() || undefined,
          properties,
          tags,
        };

        if (type === "foreshadowing") {
          updateData.planted_chapter = plantedChapter;
          updateData.planned_reveal_chapter = plannedRevealChapter;
          updateData.hint_text = hintText.trim() || undefined;
        }

        await worldService.updateEntry(projectId, entry!.id, updateData);
        toast.success("更新成功");
      } else {
        const createData: CreateEntryRequest = {
          type,
          name: name.trim(),
          description: description.trim() || undefined,
          properties,
          tags,
        };

        if (type === "foreshadowing") {
          createData.planted_chapter = plantedChapter;
          createData.planned_reveal_chapter = plannedRevealChapter;
          createData.hint_text = hintText.trim() || undefined;
        }

        await worldService.createEntry(projectId, createData);
        toast.success("创建成功");
      }

      onSave();
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存失败";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // 获取当前类型的属性配置
  const typeSchema = ENTRY_TYPE_CONFIG[type];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4 py-4">
          {/* 类型选择 */}
          <div className="space-y-2">
            <Label>条目类型</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as EntryType)}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ENTRY_TYPE_CONFIG) as EntryType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {ENTRY_TYPE_CONFIG[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 名称 */}
          <div className="space-y-2">
            <Label htmlFor="name">名称 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`输入${typeSchema.label}名称`}
            />
          </div>

          {/* 描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="详细描述..."
              rows={3}
            />
          </div>

          {/* 伏笔专用字段 */}
          {type === "foreshadowing" && (
            <>
              {/* AI 生成按钮 */}
              {!isEditing && (
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        AI 辅助生成
                      </p>
                      <p className="text-xs text-purple-600/70 dark:text-purple-400/70">
                        让 AI 根据项目背景生成伏笔建议
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateForeshadowing}
                      disabled={generating}
                      className="border-purple-300 hover:bg-purple-100 dark:border-purple-700 dark:hover:bg-purple-900/50"
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      {generating ? "生成中..." : "AI 生成"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="plantedChapter">埋设章节 *</Label>
                <Input
                  id="plantedChapter"
                  type="number"
                  min={1}
                  value={plantedChapter || ""}
                  onChange={(e) =>
                    setPlantedChapter(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="在第几章埋设伏笔"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plannedRevealChapter">计划揭示章节</Label>
                <Input
                  id="plannedRevealChapter"
                  type="number"
                  min={1}
                  value={plannedRevealChapter || ""}
                  onChange={(e) =>
                    setPlannedRevealChapter(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  placeholder="计划在第几章揭示"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hintText">提示文本</Label>
                <Textarea
                  id="hintText"
                  value={hintText}
                  onChange={(e) => setHintText(e.target.value)}
                  placeholder="伏笔的线索或提示..."
                  rows={2}
                />
              </div>
            </>
          )}

          {/* 动态属性 */}
          {typeSchema.properties &&
            Object.entries(typeSchema.properties).length > 0 && (
              <div className="space-y-3">
                <Label>属性</Label>
                {Object.entries(typeSchema.properties).map(([key, schema]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      {schema.label}
                    </Label>
                    <Input
                      value={properties[key] || ""}
                      onChange={(e) => handlePropertyChange(key, e.target.value)}
                      placeholder={schema.label}
                    />
                  </div>
                ))}
              </div>
            )}

          {/* 标签 */}
          <div className="space-y-2">
            <Label>标签</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="添加标签"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          取消
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? "保存" : "创建"}
        </Button>
      </div>
    </form>
  );
}
