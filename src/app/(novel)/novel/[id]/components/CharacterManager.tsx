"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Save, User, Heart, Swords } from "lucide-react";
import { toast } from "sonner";

interface Character {
  id: string;
  name: string;
  role: string; // 主角、配角、反派等
  description: string;
  traits: string[]; // 性格特征
  appearance: string; // 外貌描述
  background: string; // 背景故事
  relationships: {
    characterId: string;
    characterName: string;
    type: string; // 朋友、敌人、恋人、师徒等
    description: string;
  }[];
}

interface CharacterManagerProps {
  projectId: string;
  initialCharacters: Character[];
  onSave: (characters: Character[]) => Promise<void>;
}

export function CharacterManager({
  projectId,
  initialCharacters,
  onSave,
}: CharacterManagerProps) {
  const [characters, setCharacters] = useState<Character[]>(initialCharacters);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const createNewCharacter = (): Character => ({
    id: Date.now().toString(),
    name: "",
    role: "配角",
    description: "",
    traits: [],
    appearance: "",
    background: "",
    relationships: [],
  });

  const openEditDialog = (character: Character | null) => {
    setEditingCharacter(character || createNewCharacter());
    setIsDialogOpen(true);
  };

  const saveCharacter = () => {
    if (!editingCharacter) return;

    if (!editingCharacter.name.trim()) {
      toast.error("请填写角色名称");
      return;
    }

    const existingIndex = characters.findIndex(
      (c) => c.id === editingCharacter.id
    );

    if (existingIndex >= 0) {
      // 更新现有角色
      const newCharacters = [...characters];
      newCharacters[existingIndex] = editingCharacter;
      setCharacters(newCharacters);
    } else {
      // 添加新角色
      setCharacters([...characters, editingCharacter]);
    }

    setIsDialogOpen(false);
    setEditingCharacter(null);
  };

  const deleteCharacter = (id: string) => {
    if (confirm("确定要删除这个角色吗？")) {
      setCharacters(characters.filter((c) => c.id !== id));
    }
  };

  const updateEditingCharacter = (
    field: keyof Character,
    value: string | string[]
  ) => {
    if (!editingCharacter) return;
    setEditingCharacter({ ...editingCharacter, [field]: value });
  };

  const addRelationship = () => {
    if (!editingCharacter) return;
    setEditingCharacter({
      ...editingCharacter,
      relationships: [
        ...editingCharacter.relationships,
        {
          characterId: "",
          characterName: "",
          type: "朋友",
          description: "",
        },
      ],
    });
  };

  const updateRelationship = (
    index: number,
    field: string,
    value: string
  ) => {
    if (!editingCharacter) return;
    const newRelationships = [...editingCharacter.relationships];
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
      relationships: editingCharacter.relationships.filter(
        (_, i) => i !== index
      ),
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "主角":
        return "bg-red-500";
      case "配角":
        return "bg-blue-500";
      case "反派":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case "恋人":
        return <Heart className="h-4 w-4" />;
      case "敌人":
        return <Swords className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">角色管理</h2>
        <div className="flex gap-2">
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
          <Card key={character.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className={getRoleColor(character.role)}>
                    {character.name.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{character.name}</CardTitle>
                  <Badge variant="secondary" className="mt-1">
                    {character.role}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDialog(character)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteCharacter(character.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {character.description || "暂无描述"}
              </p>
              {character.traits.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {character.traits.slice(0, 3).map((trait, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {trait}
                    </Badge>
                  ))}
                  {character.traits.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{character.traits.length - 3}
                    </Badge>
                  )}
                </div>
              )}
              {character.relationships.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{character.relationships.length} 个关系</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCharacter?.name ? "编辑角色" : "新建角色"}
            </DialogTitle>
          </DialogHeader>

          {editingCharacter && (
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">角色名称 *</label>
                  <Input
                    value={editingCharacter.name}
                    onChange={(e) =>
                      updateEditingCharacter("name", e.target.value)
                    }
                    placeholder="例如：李寻欢"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">角色定位</label>
                  <select
                    value={editingCharacter.role}
                    onChange={(e) =>
                      updateEditingCharacter("role", e.target.value)
                    }
                    className="w-full rounded-md border px-3 py-2"
                  >
                    <option value="主角">主角</option>
                    <option value="配角">配角</option>
                    <option value="反派">反派</option>
                    <option value="路人">路人</option>
                  </select>
                </div>
              </div>

              {/* 简介 */}
              <div>
                <label className="text-sm font-medium">角色简介</label>
                <Textarea
                  value={editingCharacter.description}
                  onChange={(e) =>
                    updateEditingCharacter("description", e.target.value)
                  }
                  placeholder="用一两句话概括这个角色..."
                  rows={2}
                />
              </div>

              {/* 外貌 */}
              <div>
                <label className="text-sm font-medium">外貌描述</label>
                <Textarea
                  value={editingCharacter.appearance}
                  onChange={(e) =>
                    updateEditingCharacter("appearance", e.target.value)
                  }
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
                  value={editingCharacter.traits.join(", ")}
                  onChange={(e) =>
                    updateEditingCharacter(
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
                  onChange={(e) =>
                    updateEditingCharacter("background", e.target.value)
                  }
                  placeholder="描述角色的过去、经历、动机..."
                  rows={4}
                />
              </div>

              {/* 人物关系 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">人物关系</label>
                  <Button
                    onClick={addRelationship}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    添加关系
                  </Button>
                </div>
                {editingCharacter.relationships.map((rel, index) => (
                  <Card key={index} className="p-3">
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        value={rel.characterName}
                        onChange={(e) =>
                          updateRelationship(
                            index,
                            "characterName",
                            e.target.value
                          )
                        }
                        placeholder="角色名称"
                      />
                      <select
                        value={rel.type}
                        onChange={(e) =>
                          updateRelationship(index, "type", e.target.value)
                        }
                        className="rounded-md border px-2 py-1"
                      >
                        <option value="朋友">朋友</option>
                        <option value="恋人">恋人</option>
                        <option value="敌人">敌人</option>
                        <option value="师徒">师徒</option>
                        <option value="亲人">亲人</option>
                        <option value="同事">同事</option>
                      </select>
                      <div className="flex gap-1">
                        <Input
                          value={rel.description}
                          onChange={(e) =>
                            updateRelationship(
                              index,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="关系描述"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRelationship(index)}
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
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  取消
                </Button>
                <Button onClick={saveCharacter}>保存角色</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
