"use client";

import { useState, useEffect, useCallback } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, CheckCircle2, XCircle, AlertCircle, User } from "lucide-react";
import type {
  NovelCharacter,
  GetNovelCharactersResponse,
  ImportNovelCharactersRequest,
  ImportNovelCharactersResponse,
} from "../types/novel-import";

interface ImportNovelCharactersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  novelId: string;
  existingCharacterNames: string[]; // 已存在的角色名称列表
  onImportComplete: () => void;
}

/**
 * 从小说导入角色对话框
 *
 * 功能：
 * 1. 显示小说角色列表
 * 2. 自动标记已存在的角色（灰化+禁用）
 * 3. 支持全选/反选
 * 4. 批量导入
 * 5. 显示导入结果摘要
 */
export function ImportNovelCharactersDialog({
  open,
  onOpenChange,
  storyId,
  novelId,
  existingCharacterNames,
  onImportComplete,
}: ImportNovelCharactersDialogProps) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [novelCharacters, setNovelCharacters] = useState<NovelCharacter[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [novelTitle, setNovelTitle] = useState("");

  // 获取小说角色列表
  useEffect(() => {
    if (!open || !novelId) return;

    const fetchCharacters = async () => {
      setLoading(true);

      try {
        const response = await fetch(`/api/novel/${novelId}/characters`);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "获取角色列表失败");
        }

        const data: GetNovelCharactersResponse = await response.json();

        setNovelTitle(data.novel_title);
        setNovelCharacters(data.characters);

        // 自动选中未存在的角色
        const existingNamesSet = new Set(
          existingCharacterNames.map((name) => name.toLowerCase().trim())
        );

        const newCharacterIds = data.characters
          .filter((char) => !existingNamesSet.has(char.name.toLowerCase().trim()))
          .map((char) => char.tempId || char.name);

        setSelectedIds(new Set(newCharacterIds));
      } catch (error) {
        console.error("Fetch novel characters error:", error);
        toast({
          title: "获取角色列表失败",
          description: error instanceof Error ? error.message : "请稍后重试",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCharacters();
  }, [open, novelId, existingCharacterNames, toast]);

  // 判断角色是否已存在
  const isCharacterExisting = useCallback(
    (characterName: string) => {
      const normalizedName = characterName.toLowerCase().trim();
      return existingCharacterNames
        .map((name) => name.toLowerCase().trim())
        .includes(normalizedName);
    },
    [existingCharacterNames]
  );

  // 切换选择
  const toggleSelection = useCallback((charId: string, charName: string) => {
    // 如果角色已存在，不允许选择
    if (isCharacterExisting(charName)) return;

    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(charId)) {
        newSet.delete(charId);
      } else {
        newSet.add(charId);
      }
      return newSet;
    });
  }, [isCharacterExisting]);

  // 全选/反选
  const toggleSelectAll = useCallback(() => {
    const availableCharIds = novelCharacters
      .filter((char) => !isCharacterExisting(char.name))
      .map((char) => char.tempId || char.name);

    if (selectedIds.size === availableCharIds.length) {
      // 全部已选，清空
      setSelectedIds(new Set());
    } else {
      // 全选可用角色
      setSelectedIds(new Set(availableCharIds));
    }
  }, [novelCharacters, selectedIds.size, isCharacterExisting]);

  // 导入角色
  const handleImport = useCallback(async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "请选择角色",
        description: "请至少选择一个角色进行导入",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);

    try {
      // 构建请求数据
      const selectedCharacters = novelCharacters.filter((char) =>
        selectedIds.has(char.tempId || char.name)
      );

      const requestData: ImportNovelCharactersRequest = {
        novel_id: novelId,
        characters: selectedCharacters,
      };

      const response = await fetch(`/api/story/${storyId}/import-novel-characters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "导入失败");
      }

      const result: ImportNovelCharactersResponse = await response.json();

      // 显示结果摘要
      toast({
        title: "导入完成",
        description: `成功导入 ${result.summary.imported_count} 个角色，跳过 ${result.summary.skipped_count} 个`,
      });

      // 关闭对话框并刷新
      onOpenChange(false);
      onImportComplete();
    } catch (error) {
      console.error("Import characters error:", error);
      toast({
        title: "导入失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  }, [selectedIds, novelCharacters, novelId, storyId, toast, onOpenChange, onImportComplete]);

  // 获取角色类型标签
  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      protagonist: "主角",
      antagonist: "反派",
      supporting: "配角",
      minor: "龙套",
    };
    return labels[role.toLowerCase()] || role;
  };

  // 获取角色类型颜色
  const getRoleColor = (role: string): string => {
    const colors: Record<string, string> = {
      protagonist: "bg-orange-500",
      antagonist: "bg-red-500",
      supporting: "bg-blue-500",
      minor: "bg-gray-500",
    };
    return colors[role.toLowerCase()] || "bg-gray-500";
  };

  const availableCount = novelCharacters.filter((char) => !isCharacterExisting(char.name)).length;
  const existingCount = novelCharacters.length - availableCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            从小说导入角色
          </DialogTitle>
          <DialogDescription>
            从《{novelTitle}》中选择角色导入到剧本
          </DialogDescription>
        </DialogHeader>

        {/* 角色列表 */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">加载角色列表...</p>
            </div>
          ) : novelCharacters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">此小说暂无角色信息</p>
            </div>
          ) : (
            <>
              {/* 统计信息 + 全选 */}
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    共 {novelCharacters.length} 个角色
                  </span>
                  <Badge variant="secondary">{availableCount} 个可导入</Badge>
                  {existingCount > 0 && (
                    <Badge variant="outline">{existingCount} 个已存在</Badge>
                  )}
                </div>

                {availableCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    disabled={importing}
                  >
                    {selectedIds.size === availableCount ? "取消全选" : "全选"}
                  </Button>
                )}
              </div>

              {/* 角色卡片列表 */}
              <div className="space-y-2">
                {novelCharacters.map((char) => {
                  const charId = char.tempId || char.name;
                  const isExisting = isCharacterExisting(char.name);
                  const isSelected = selectedIds.has(charId);

                  return (
                    <div
                      key={charId}
                      className={`
                        flex items-start gap-3 p-4 rounded-lg border-2 transition-all
                        ${isExisting ? "bg-muted/50 border-muted" : "border-border hover:border-primary/50"}
                        ${isSelected && !isExisting ? "border-primary bg-primary/5" : ""}
                        ${isExisting ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                      `}
                      onClick={() => toggleSelection(charId, char.name)}
                    >
                      {/* 选择框 */}
                      <div className="pt-1">
                        <Checkbox
                          checked={isSelected}
                          disabled={isExisting || importing}
                          onCheckedChange={() => toggleSelection(charId, char.name)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* 角色图标 */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                          <User className="w-6 h-6" />
                        </div>
                      </div>

                      {/* 角色信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">{char.name}</h4>
                          <Badge
                            variant="secondary"
                            className={`${getRoleColor(char.role)} text-white text-xs`}
                          >
                            {getRoleLabel(char.role)}
                          </Badge>
                          {isExisting && (
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              已存在
                            </Badge>
                          )}
                        </div>

                        {char.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {char.description}
                          </p>
                        )}

                        {char.traits && char.traits.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {char.traits.slice(0, 3).map((trait, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {trait}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importing}
          >
            取消
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || loading || selectedIds.size === 0}
            className="gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                导入中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                导入选中角色 ({selectedIds.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImportNovelCharactersDialog;
