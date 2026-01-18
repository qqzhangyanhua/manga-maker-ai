/**
 * 角色编辑对话框组件
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Character, CharacterRelationship } from "./types";
import { CHARACTER_ROLES, RELATIONSHIP_TYPES } from "./types";
import { novelTheme } from "../../../theme";
import { cn } from "@/lib/utils";

interface CharacterEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character | null;
  onSave: (character: Character) => void;
}

export function CharacterEditDialog({
  isOpen,
  onClose,
  character,
  onSave,
}: CharacterEditDialogProps) {
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(character);
  const [deleteRelationshipIndex, setDeleteRelationshipIndex] = useState<number | null>(null);

  // 当 character prop 变化时更新内部状态
  if (character !== null && editingCharacter?.id !== character.id) {
    setEditingCharacter(character);
  }

  const updateField = (field: keyof Character, value: string | string[]) => {
    if (!editingCharacter) return;
    setEditingCharacter({ ...editingCharacter, [field]: value });
  };

  const addRelationship = () => {
    if (!editingCharacter) return;
    const newRelationship: CharacterRelationship = {
      characterId: "",
      characterName: "",
      relation: "朋友",
      description: "",
    };
    setEditingCharacter({
      ...editingCharacter,
      relationships: [...(editingCharacter.relationships || []), newRelationship],
    });
  };

  const updateRelationship = (index: number, field: keyof CharacterRelationship, value: string) => {
    if (!editingCharacter) return;
    const newRelationships = [...(editingCharacter.relationships || [])];
    newRelationships[index] = { ...newRelationships[index], [field]: value };
    setEditingCharacter({
      ...editingCharacter,
      relationships: newRelationships,
    });
  };

  const removeRelationship = (index: number) => {
    if (!editingCharacter) return;
    setEditingCharacter({
      ...editingCharacter,
      relationships: (editingCharacter.relationships || []).filter((_, i) => i !== index),
    });
    setDeleteRelationshipIndex(null);
  };

  const handleSave = () => {
    if (!editingCharacter) return;

    if (!editingCharacter.name.trim()) {
      toast.error("请填写角色名称");
      return;
    }

    onSave(editingCharacter);
    onClose();
  };

  const handleClose = () => {
    setEditingCharacter(null);
    onClose();
  };

  if (!editingCharacter) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900/95 border-purple-500/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>
              {editingCharacter.name ? "编辑角色" : "新建角色"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">角色名称 *</label>
                <Input
                  value={editingCharacter.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="例如：李寻欢"
                  className={novelTheme.input.base}
                />
              </div>
              <div>
                <label className="text-sm font-medium">角色定位</label>
                <select
                  value={editingCharacter.role}
                  onChange={(e) => updateField("role", e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                >
                  {CHARACTER_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 简介 */}
            <div>
              <label className="text-sm font-medium">角色简介</label>
                              <Textarea
                                value={editingCharacter.description}
                                onChange={(e) => updateField("description", e.target.value)}
                                placeholder="用一两句话概括这个角色..."
                                rows={2}
                                className={novelTheme.input.base}
                              />            </div>

            {/* 外貌 */}
            <div>
              <label className="text-sm font-medium">外貌描述</label>
              <Textarea
                value={editingCharacter.appearance}
                onChange={(e) => updateField("appearance", e.target.value)}
                placeholder="描述角色的外貌特征、穿着打扮..."
                rows={3}
              />
            </div>

            {/* 性格特征 */}
            <div>
              <label className="text-sm font-medium">
                性格特征（用逗号分隔）
              </label>
              <Input
                value={(editingCharacter.traits || []).join(", ")}
                onChange={(e) =>
                  updateField(
                    "traits",
                    e.target.value.split(",").map((t) => t.trim())
                  )
                }
                placeholder="例如：冷静、果断、重情重义"
              />
            </div>

            {/* 背景故事 */}
            <div>
              <label className="text-sm font-medium">背景故事</label>
              <Textarea
                value={editingCharacter.background}
                onChange={(e) => updateField("background", e.target.value)}
                placeholder="描述角色的过去、经历、动机..."
                rows={4}
              />
            </div>

            {/* 人物关系 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">人物关系</label>
                <Button onClick={addRelationship} variant="outline" size="sm">
                  <Plus className="mr-1 h-3 w-3" />
                  添加关系
                </Button>
              </div>
              {(editingCharacter.relationships || []).map((rel, index) => (
                <Card key={`relationship-${rel.characterId}-${index}`} className={cn("p-3", novelTheme.card.base)}>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      value={rel.characterName}
                      onChange={(e) =>
                        updateRelationship(index, "characterName", e.target.value)
                      }
                      placeholder="角色名称"
                    />
                    <select
                      value={rel.relation}
                      onChange={(e) =>
                        updateRelationship(index, "relation", e.target.value)
                      }
                      className="rounded-md border px-2 py-1"
                    >
                      {RELATIONSHIP_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      <Input
                        value={rel.description}
                        onChange={(e) =>
                          updateRelationship(index, "description", e.target.value)
                        }
                        placeholder="关系描述"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteRelationshipIndex(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* 保存按钮 */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button onClick={handleSave} className={novelTheme.button.primary}>保存角色</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除关系确认对话框 */}
      <AlertDialog
        open={deleteRelationshipIndex !== null}
        onOpenChange={() => setDeleteRelationshipIndex(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个人物关系吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteRelationshipIndex !== null &&
                removeRelationship(deleteRelationshipIndex)
              }
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
