"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Save, X, Plus, Trash2, BookOpen, Users, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EditableStory, StoryAct, StoryCharacter, StoryOutline } from "./type";

interface EditableStoryFormProps {
    story: EditableStory;
    onSave: (updatedStory: EditableStory) => void;
    onCancel: () => void;
}

export function EditableStoryForm({ story, onSave, onCancel }: EditableStoryFormProps) {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    // Normalize data structure: handle both outline object and story object
    // - outline object (from /api/story/generate): { title, genre, logline, acts, characters, themes, setting }
    // - story object (from database): { id, title, premise, genre, outline: {...}, characters: [...] }
    const isStoryObject = "id" in story && "outline" in story;

    const normalizedData = isStoryObject
        ? {
              id: story.id,
              title: story.title,
              premise: story.premise || "",
              genre: story.genre || "suspense",
              logline: story.outline?.logline || "",
              setting: story.outline?.setting || "",
              acts: story.outline?.acts || [],
              characters: story.outline?.characters || story.characters || [],
              themes: story.outline?.themes || [],
          }
        : {
              id: story.id || null,
              title: story.title || "",
              premise: story.premise || "",
              genre: story.genre || "suspense",
              logline: story.logline || "",
              setting: story.setting || "",
              acts: story.acts || [],
              characters: story.characters || [],
              themes: story.themes || [],
          };

    // Editable state
    const [title, setTitle] = useState(normalizedData.title);
    const [premise, setPremise] = useState(normalizedData.premise);
    const [genre, setGenre] = useState(normalizedData.genre);
    const [logline, setLogline] = useState(normalizedData.logline);
    const [setting, setSetting] = useState(normalizedData.setting);
    const [acts, setActs] = useState<StoryAct[]>(normalizedData.acts);
    const [characters, setCharacters] = useState<StoryCharacter[]>(normalizedData.characters);
    const [themes, setThemes] = useState(normalizedData.themes);

    async function handleSave() {
        if (!title.trim()) {
            toast({
                title: "错误",
                description: "请输入故事标题",
                variant: "destructive",
            });
            return;
        }

        try {
            setSaving(true);

            // Build complete outline object
            const completeOutline = {
                title,
                genre,
                logline,
                setting,
                acts,
                characters,
                themes,
            };

            const storyId = normalizedData.id;

            if (storyId) {
                // Update existing story using PATCH API
                const res = await fetch(`/api/story/${storyId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title,
                        premise,
                        genre,
                        outline: completeOutline,
                        characters,
                    }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "保存失败");
                }

                const data = await res.json();

                toast({
                    title: "保存成功",
                    description: "故事已更新",
                });

                onSave(data.story);
            } else {
                // Create new story using POST API
                const res = await fetch("/api/story", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title,
                        premise,
                        genre,
                        outline: completeOutline,
                        characters,
                        status: "draft",
                    }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "保存失败");
                }

                const data = await res.json();

                toast({
                    title: "保存成功",
                    description: "故事已创建",
                });

                onSave(data.story);
            }
        } catch (error) {
            console.error("Save story error:", error);
            const message = error instanceof Error ? error.message : "保存失败";
            toast({
                title: "保存失败",
                description: message,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    }

    function updateAct(index: number, field: string, value: string) {
        const newActs = [...acts];
        newActs[index] = { ...newActs[index], [field]: value };
        setActs(newActs);
    }

    function removeAct(index: number) {
        setActs(acts.filter((_, i) => i !== index));
    }

    function addAct() {
        setActs([
            ...acts,
            {
                actNumber: acts.length + 1,
                name: "",
                summary: "",
                scenes: [],
                keyEvents: [],
            },
        ]);
    }

    function updateCharacter(index: number, field: string, value: string) {
        const newChars = [...characters];
        newChars[index] = { ...newChars[index], [field]: value };
        setCharacters(newChars);
    }

    function removeCharacter(index: number) {
        setCharacters(characters.filter((_, i) => i !== index));
    }

    function addCharacter() {
        setCharacters([
            ...characters,
            {
                name: "",
                role: "",
                description: "",
                arc: "",
                traits: [],
            },
        ]);
    }

    function addTheme() {
        setThemes([...themes, ""]);
    }

    function updateTheme(index: number, value: string) {
        const newThemes = [...themes];
        newThemes[index] = value;
        setThemes(newThemes);
    }

    function removeTheme(index: number) {
        setThemes(themes.filter((_: string, i: number) => i !== index));
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>编辑故事</CardTitle>
                <CardDescription>
                    修改故事的标题、前提、大纲和角色设定
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">故事标题 *</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="输入故事标题"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="premise">故事前提</Label>
                        <Textarea
                            id="premise"
                            value={premise}
                            onChange={(e) => setPremise(e.target.value)}
                            rows={3}
                            placeholder="故事的核心创意和前提"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="genre">故事类型</Label>
                        <Select value={genre} onValueChange={setGenre}>
                            <SelectTrigger id="genre">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="suspense">悬疑推理</SelectItem>
                                <SelectItem value="romance">浪漫爱情</SelectItem>
                                <SelectItem value="adventure">冒险</SelectItem>
                                <SelectItem value="scifi">科幻</SelectItem>
                                <SelectItem value="daily">日常</SelectItem>
                                <SelectItem value="fantasy">奇幻</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="logline">故事梗概</Label>
                        <Textarea
                            id="logline"
                            value={logline}
                            onChange={(e) => setLogline(e.target.value)}
                            rows={2}
                            placeholder="一句话概括故事内容"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="setting">故事背景设定</Label>
                        <Textarea
                            id="setting"
                            value={setting}
                            onChange={(e) => setSetting(e.target.value)}
                            rows={3}
                            placeholder="时间、地点、世界观等背景设定"
                        />
                    </div>
                </div>

                {/* Acts */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            故事结构 ({acts.length} 幕)
                        </Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addAct}
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            添加幕
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {acts.map((act, idx) => (
                            <div
                                key={idx}
                                className="p-4 border rounded-md space-y-2 bg-muted/50"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">第 {act.actNumber} 幕</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeAct(idx)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <Input
                                    placeholder="幕次名称"
                                    value={act.name || ""}
                                    onChange={(e) => updateAct(idx, "name", e.target.value)}
                                />
                                <Textarea
                                    placeholder="幕次概要"
                                    value={act.summary || ""}
                                    onChange={(e) => updateAct(idx, "summary", e.target.value)}
                                    rows={2}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Themes */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            故事主题 ({themes.length})
                        </Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addTheme}
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            添加主题
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {themes.map((theme: string, idx: number) => (
                            <div
                                key={idx}
                                className="flex gap-2 items-center"
                            >
                                <Input
                                    placeholder="如：成长与自我认同"
                                    value={theme}
                                    onChange={(e) => updateTheme(idx, e.target.value)}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTheme(idx)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        {themes.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                暂无主题，点击"添加主题"按钮添加
                            </p>
                        )}
                    </div>
                </div>

                {/* Characters */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            主要角色 ({characters.length})
                        </Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addCharacter}
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            添加角色
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {characters.map((char, idx) => (
                            <div
                                key={idx}
                                className="p-4 border rounded-md space-y-2 bg-muted/50"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">角色 {idx + 1}</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeCharacter(idx)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        placeholder="角色名"
                                        value={char.name || ""}
                                        onChange={(e) =>
                                            updateCharacter(idx, "name", e.target.value)
                                        }
                                    />
                                    <Input
                                        placeholder="角色定位"
                                        value={char.role || ""}
                                        onChange={(e) =>
                                            updateCharacter(idx, "role", e.target.value)
                                        }
                                    />
                                </div>
                                <Textarea
                                    placeholder="角色描述"
                                    value={char.description || ""}
                                    onChange={(e) =>
                                        updateCharacter(idx, "description", e.target.value)
                                    }
                                    rows={2}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={onCancel} disabled={saving}>
                        <X className="w-4 h-4 mr-2" />
                        取消
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="flex-1">
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? "保存中..." : "保存修改"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
