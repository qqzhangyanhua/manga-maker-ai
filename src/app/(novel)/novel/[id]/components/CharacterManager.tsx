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
import { Plus, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { GenerateCharactersDialog } from "./GenerateCharactersDialog";
import {
  CharacterCard,
  CharacterEditDialog,
  ensureCharacterFields,
  createNewCharacter,
} from "./character";
// ✅ 使用主类型文件中的类型
import type { Character, ChapterOutline } from "../types";

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">角色管理</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsGenerateDialogOpen(true)}
            variant="outline"
            disabled={outlines.length === 0}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            AI 生成角色
          </Button>
          <Button onClick={() => openEditDialog(null)} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            添加角色
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {/* 角色卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            onEdit={openEditDialog}
            onDelete={setDeleteCharacterId}
          />
        ))}
      </div>

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
    </div>
  );
}
