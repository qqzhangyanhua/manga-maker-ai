"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Plus,
  Download,
  MoreVertical,
  RefreshCw,
  Upload,
  Trash2,
  Eye,
  Loader2,
  Sparkles, // Phase 2.1
} from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ROLE_LABELS, ROLE_COLORS } from "../constants/characterRoles";
import CreateCharacterDialog from "@/components/AssetLibrary/CreateCharacterDialog";
import ImportNovelCharactersDialog from "./ImportNovelCharactersDialog"; // 小说角色导入
import type { CharacterInfo } from "../types/character";
import type { CharacterAsset } from "@/components/AssetLibrary/CharacterLibrary";
import type { CharacterRole } from "@/components/character/RoleSelector";
import type { CharacterRecommendation, RecommendCharactersResponse } from "../types/ai-recommendation"; // Phase 2.1

interface StoryCharacter {
  character: CharacterInfo;
  role: string;
}

interface StoryCharactersManagerProps {
  storyId: string;
  sourceNovelId: string | null;
  storyCharacters: StoryCharacter[];
  onCharacterSelect: (character: CharacterInfo, role: string) => void;
  onRefresh: () => void;
}

export function StoryCharactersManager({
  storyId,
  sourceNovelId,
  storyCharacters,
  onCharacterSelect,
  onRefresh,
}: StoryCharactersManagerProps) {
  const { toast } = useToast();
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  // 角色创建对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // 小说角色导入对话框状态
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Phase 2.1: AI 推荐相关状态
  const [recommendations, setRecommendations] = useState<CharacterRecommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  // Phase 2.1: 获取 AI 推荐
  const handleGetRecommendations = useCallback(async () => {
    try {
      setIsLoadingRecommendations(true);

      const response = await fetch(`/api/story/${storyId}/recommend-characters`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "获取推荐失败");
      }

      const data: RecommendCharactersResponse = await response.json();

      setRecommendations(data.recommendations);

      // 如果有推荐，自动打开创建对话框
      if (data.recommendations.length > 0) {
        setCreateDialogOpen(true);

        toast({
          title: "AI 推荐已生成",
          description: `根据剧本分析，推荐创建 ${data.recommendations.length} 种角色类型`,
        });
      } else {
        toast({
          title: "角色配置完善",
          description: "当前剧本的角色配置已经很好，暂无推荐",
        });
      }
    } catch (error) {
      console.error("Get recommendations error:", error);
      toast({
        title: "获取推荐失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRecommendations(false);
    }
  }, [storyId, toast]);


  // 创建角色并关联到剧本
  const handleCreateCharacter = useCallback(
    async (character: CharacterAsset, role?: CharacterRole) => {
      try {
        // 步骤1: 角色已通过 CreateCharacterDialog 创建，现在关联到剧本
        const response = await fetch(`/api/story/${storyId}/characters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            character_id: character.id,
            role: role || "supporting", // 使用用户选择的角色类型，默认配角
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "关联失败");
        }

        // 步骤2: 成功提示
        toast({
          title: "创建成功",
          description: `角色「${character.name}」已添加到剧本`,
        });

        // 步骤3: 关闭对话框并刷新列表
        setCreateDialogOpen(false);
        onRefresh();
      } catch (error) {
        console.error("Associate character error:", error);

        // 边缘情况处理: 角色已创建但关联失败
        // 例如：角色已存在于剧本、网络错误等
        const errorMessage = error instanceof Error ? error.message : "关联失败";

        toast({
          title: "部分成功",
          description: `角色「${character.name}」已创建，但关联到剧本失败：${errorMessage}。你可以从角色库手动添加此角色。`,
          variant: "destructive",
        });

        // 注意: 不关闭对话框，让用户可以看到错误信息并决定下一步操作
      }
    },
    [storyId, toast, onRefresh]
  );

  // 重新生成角色图片
  const handleRegenerateImage = useCallback(
    async (characterId: string) => {
      try {
        setRegeneratingId(characterId);

        const response = await fetch(`/api/character/${characterId}/regenerate-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "fast" }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "重新生成失败");
        }

        toast({
          title: "重新生成成功",
          description: "角色图片已更新",
        });

        onRefresh();
      } catch (error) {
        console.error("Regenerate image error:", error);
        toast({
          title: "重新生成失败",
          description: error instanceof Error ? error.message : "重新生成角色图片失败",
          variant: "destructive",
        });
      } finally {
        setRegeneratingId(null);
      }
    },
    [toast, onRefresh]
  );

  // 上传角色图片
  const handleUploadImage = useCallback(
    async (characterId: string, file: File) => {
      try {
        setUploadingId(characterId);

        const formData = new FormData();
        formData.append("image", file);
        formData.append("character_id", characterId);

        const response = await fetch("/api/character/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "上传失败");
        }

        toast({
          title: "上传成功",
          description: "角色图片已更新",
        });

        setUploadDialogOpen(false);
        setSelectedCharacterId(null);
        onRefresh();
      } catch (error) {
        console.error("Upload image error:", error);
        toast({
          title: "上传失败",
          description: error instanceof Error ? error.message : "上传角色图片失败",
          variant: "destructive",
        });
      } finally {
        setUploadingId(null);
      }
    },
    [toast, onRefresh]
  );

  // 打开上传对话框
  const openUploadDialog = useCallback((characterId: string) => {
    setSelectedCharacterId(characterId);
    setUploadDialogOpen(true);
  }, []);

  // 文件选择处理
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && selectedCharacterId) {
        void handleUploadImage(selectedCharacterId, file);
      }
    },
    [selectedCharacterId, handleUploadImage]
  );

  // 移除角色
  const handleRemoveCharacter = useCallback(
    async (characterId: string) => {
      try {
        const response = await fetch(
          `/api/story/${storyId}/characters/${characterId}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "移除失败");
        }

        toast({
          title: "移除成功",
          description: "角色已从剧本中移除",
        });

        onRefresh();
      } catch (error) {
        console.error("Remove character error:", error);
        toast({
          title: "移除失败",
          description: error instanceof Error ? error.message : "移除角色失败",
          variant: "destructive",
        });
      }
    },
    [storyId, toast, onRefresh]
  );

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">角色管理</h3>
          <Badge variant="secondary">{storyCharacters.length}</Badge>
        </div>

        <div className="flex gap-2">
          {/* 导入小说角色按钮 */}
          {sourceNovelId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportDialogOpen(true)}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              导入小说角色
            </Button>
          )}

          {/* Phase 2.1: AI 推荐按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGetRecommendations}
            disabled={isLoadingRecommendations}
            className="gap-2"
          >
            {isLoadingRecommendations ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                AI 推荐
              </>
            )}
          </Button>

          {/* 创建新角色按钮 */}
          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
          >
            <Plus className="w-4 h-4" />
            创建角色
          </Button>
        </div>
      </div>

      {/* 角色列表 */}
      {storyCharacters.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {storyCharacters.map((sc) => (
            <Card
              key={sc.character.id}
              className="group relative overflow-hidden hover:border-orange-500/50 transition-all"
            >
              {/* 角色卡片内容 */}
              <div className="p-4 space-y-3">
                {/* 角色头像 */}
                <div className="relative">
                  {sc.character.reference_image ? (
                    <img
                      src={sc.character.reference_image}
                      alt={sc.character.name}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-3xl">
                      {sc.character.name.charAt(0)}
                    </div>
                  )}

                  {/* 操作菜单 */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 bg-black/50 hover:bg-black/70"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onCharacterSelect(sc.character, sc.role)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRegenerateImage(sc.character.id)}
                          disabled={regeneratingId === sc.character.id}
                        >
                          {regeneratingId === sc.character.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          重新生成图片
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openUploadDialog(sc.character.id)}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          上传图片
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRemoveCharacter(sc.character.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          移除角色
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* 加载状态覆盖层 */}
                  {(regeneratingId === sc.character.id ||
                    uploadingId === sc.character.id) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>

                {/* 角色信息 */}
                <div className="space-y-1">
                  <div className="font-medium truncate">{sc.character.name}</div>
                  <Badge
                    variant="secondary"
                    className={`${ROLE_COLORS[sc.role]} text-white text-xs`}
                  >
                    {ROLE_LABELS[sc.role] || sc.role}
                  </Badge>
                </div>

                {/* 角色描述 */}
                {sc.character.base_prompt && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {sc.character.base_prompt}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Users className="w-full h-full" />}
          title="暂无关联角色"
          description={
            sourceNovelId
              ? "从小说导入角色或手动创建新角色"
              : "创建角色让故事更加生动"
          }
          action={
            sourceNovelId ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => setImportDialogOpen(true)}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                >
                  <Download className="mr-2 h-4 w-4" />
                  导入小说角色
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  创建角色
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                创建第一个角色
              </Button>
            )
          }
        />
      )}

      {/* 上传图片对话框 */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传角色图片</DialogTitle>
            <DialogDescription>
              选择一张图片作为角色的参考图
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={!!uploadingId}
                className="hidden"
                id="character-image-upload"
              />
              <label
                htmlFor="character-image-upload"
                className="cursor-pointer"
              >
                {uploadingId ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">上传中...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      点击选择图片文件
                    </p>
                    <p className="text-xs text-muted-foreground">
                      支持 JPG、PNG 格式
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 创建角色对话框 */}
      <CreateCharacterDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateCharacter}
        showRoleSelector={true}
        defaultRole="supporting"
        contextMode="story"
        recommendations={recommendations} // Phase 2.1: 传递 AI 推荐
      />

      {/* 导入小说角色对话框 */}
      {sourceNovelId && (
        <ImportNovelCharactersDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          storyId={storyId}
          novelId={sourceNovelId}
          existingCharacterNames={storyCharacters.map((sc) => sc.character.name)}
          onImportComplete={onRefresh}
        />
      )}
    </div>
  );
}
