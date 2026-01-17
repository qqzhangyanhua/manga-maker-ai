/**
 * 角色管理组件
 * 更新版本：使用统一的类型系统
 */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { Plus, Save, Sparkles, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { GenerateCharactersDialog } from "./GenerateCharactersDialog";
import { GenerateCharacterImageDialog } from "./character/GenerateCharacterImageDialog";
import { BatchGenerateDialog } from "./character/BatchGenerateDialog";
import {
  CharacterCard,
  CharacterEditDialog,
  ensureCharacterFields,
  createNewCharacter,
} from "./character";
// ✅ 使用主类型文件中的类型
import type { Character, ChapterOutline } from "../types";
import type { GenerateCharacterImageResponse } from "@/app/api/novel/character/generate-image/types";
import { novelTheme } from "../../theme";

interface CharacterManagerProps {
  projectId: string;
  initialCharacters: Character[];
  outlines?: ChapterOutline[];
  onSave: (characters: Character[]) => Promise<void>;
}

export function CharacterManager({
  projectId,
  initialCharacters,
  outlines = [],
  onSave,
}: CharacterManagerProps) {
  const [characters, setCharacters] = useState<Character[]>(
    initialCharacters.map(ensureCharacterFields)
  );
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isBatchGenerateDialogOpen, setIsBatchGenerateDialogOpen] = useState(false);
  const [isGenerateImageDialogOpen, setIsGenerateImageDialogOpen] = useState(false);
  const [characterForImageGeneration, setCharacterForImageGeneration] = useState<Character | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteCharacterId, setDeleteCharacterId] = useState<string | null>(null);

  // 当 initialCharacters 变化时更新 characters
  useEffect(() => {
    setCharacters(initialCharacters.map(ensureCharacterFields));
  }, [initialCharacters]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(characters);
      toast.success("角色设定已保存");
    } catch (error) {
      toast.error("保存失败");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const openEditDialog = (character: Character | null) => {
    setEditingCharacter(character || createNewCharacter());
    setIsEditDialogOpen(true);
  };

  const handleSaveCharacter = (updatedCharacter: Character) => {
    const existingIndex = characters.findIndex((c) => c.id === updatedCharacter.id);

    if (existingIndex >= 0) {
      // 更新现有角色
      const newCharacters = [...characters];
      newCharacters[existingIndex] = updatedCharacter;
      setCharacters(newCharacters);
    } else {
      // 添加新角色
      setCharacters([...characters, updatedCharacter]);
    }

    setEditingCharacter(null);
  };

  const handleDeleteCharacter = () => {
    if (deleteCharacterId) {
      setCharacters(characters.filter((c) => c.id !== deleteCharacterId));
      setDeleteCharacterId(null);
    }
  };

  const handleGeneratedCharacters = async (generatedCharacters: Character[]) => {
    // 合并生成的角色到现有列表
    const updatedCharacters = [...characters, ...generatedCharacters];
    setCharacters(updatedCharacters);

    // 自动保存到数据库
    try {
      await onSave(updatedCharacters);
      toast.success(`已添加并保存 ${generatedCharacters.length} 个角色`);
    } catch (error) {
      toast.error("保存失败，请手动点击保存按钮");
      console.error("保存生成的角色失败:", error);
    }
  };

  const handleOpenGenerateImage = (character: Character) => {
    setCharacterForImageGeneration(character);
    setIsGenerateImageDialogOpen(true);
  };

  const handleImageGenerationSuccess = async (result: GenerateCharacterImageResponse) => {
    // 乐观更新：立即更新本地状态，无需等待服务器刷新
    setCharacters(prevCharacters =>
      prevCharacters.map(c =>
        c.id === result.updatedCharacter.id
          ? {
              ...c,
              ...result.updatedCharacter,
              // 确保包含所有生成的字段
              generatedImageUrl: result.imageUrl,
              assetCharacterId: result.assetCharacterId,
              lastGeneratedAt: result.updatedCharacter.lastGeneratedAt,
            }
          : c
      )
    );

    // 关闭对话框
    setIsGenerateImageDialogOpen(false);
    setCharacterForImageGeneration(null);

    // 用户反馈
    toast.success(`${result.updatedCharacter.name} 的图片已生成并显示`);
  };

  const handleBatchGenerationComplete = () => {
    // 批量生成完成后，简单通知并关闭对话框
    setIsBatchGenerateDialogOpen(false);
    toast.success("批量生成完成，请刷新页面查看结果");
    // TODO: 未来可以优化为批量乐观更新
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">角色管理</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsGenerateDialogOpen(true)}
            variant="outline"
            disabled={outlines.length === 0}
            title={outlines.length === 0 ? "请先创建章节大纲" : ""}
            className={novelTheme.button.outline}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            AI 生成角色
          </Button>
          <Button
            onClick={() => setIsBatchGenerateDialogOpen(true)}
            variant="outline"
            disabled={characters.length === 0}
            title={characters.length === 0 ? "暂无角色可生成" : "批量生成角色图片"}
            className={novelTheme.button.outline}
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            批量生成图片
          </Button>
          <Button onClick={() => openEditDialog(null)} variant="outline" className={novelTheme.button.outline}>
            <Plus className="mr-2 h-4 w-4" />
            添加角色
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className={novelTheme.button.primary}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {/* 角色卡片网格或空状态 */}
      {characters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-zinc-800 rounded-lg bg-zinc-900/20">
          <div className="text-center space-y-4">
            <div className="text-zinc-600 text-6xl">👥</div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-300 mb-2">
                暂无角色
              </h3>
              <p className="text-sm text-zinc-500 mb-4">
                {outlines.length === 0
                  ? "请先创建章节大纲，然后使用 AI 生成角色"
                  : "点击上方按钮添加角色或使用 AI 生成角色"}
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              {outlines.length > 0 && (
                <Button
                  onClick={() => setIsGenerateDialogOpen(true)}
                  className={novelTheme.button.primary}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI 生成角色
                </Button>
              )}
              <Button onClick={() => openEditDialog(null)} variant="outline" className={novelTheme.button.outline}>
                <Plus className="mr-2 h-4 w-4" />
                手动添加
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onEdit={openEditDialog}
              onDelete={setDeleteCharacterId}
              onGenerateImage={handleOpenGenerateImage}
            />
          ))}
        </div>
      )}

      {/* 编辑对话框 */}
      <CharacterEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingCharacter(null);
        }}
        character={editingCharacter}
        onSave={handleSaveCharacter}
      />

      {/* 删除确认对话框 */}
      <AlertDialog
        open={deleteCharacterId !== null}
        onOpenChange={() => setDeleteCharacterId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个角色吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCharacter}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI 生成角色对话框 */}
      <GenerateCharactersDialog
        isOpen={isGenerateDialogOpen}
        onClose={() => setIsGenerateDialogOpen(false)}
        projectId={projectId}
        outlines={outlines}
        onGenerated={handleGeneratedCharacters}
      />

      {/* 角色图片生成对话框 */}
      <GenerateCharacterImageDialog
        isOpen={isGenerateImageDialogOpen}
        onClose={() => {
          setIsGenerateImageDialogOpen(false);
          setCharacterForImageGeneration(null);
        }}
        character={characterForImageGeneration}
        novelProjectId={projectId}
        onSuccess={handleImageGenerationSuccess}
      />

      {/* 批量生成对话框 */}
      <BatchGenerateDialog
        isOpen={isBatchGenerateDialogOpen}
        onClose={() => setIsBatchGenerateDialogOpen(false)}
        characters={characters}
        novelProjectId={projectId}
        onSuccess={handleBatchGenerationComplete}
      />
    </div>
  );
}
