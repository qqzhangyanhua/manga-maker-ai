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
import { Save, X, Plus, Trash2, BookOpen, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditableStoryFormProps {
    story: any;
    onSave: (updatedStory: any) => void;
    onCancel: () => void;
}

export function EditableStoryForm({ story, onSave, onCancel }: EditableStoryFormProps) {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    // Editable state
    const [title, setTitle] = useState(story.title || "");
    const [premise, setPremise] = useState(story.premise || "");
    const [genre, setGenre] = useState(story.genre || "suspense");
    const [outline, setOutline] = useState(story.outline || {});
    const [characters, setCharacters] = useState(story.characters || []);

    // Edit outline
    const [logline, setLogline] = useState(outline.logline || "");
    const [acts, setActs] = useState(outline.acts || []);

    async function handleSave() {
        if (!title.trim()) {
            toast({
                title: "错误",
                description: "请输入故事标题",
                variant: "destructive",
            });
            return;
        }

        if (!premise.trim()) {
            toast({
                title: "错误",
                description: "请输入故事前提",
                variant: "destructive",
            });
            return;
        }

        try {
            setSaving(true);

            const updatedStory = {
                ...story,
                title,
                premise,
                genre,
                outline: {
                    ...outline,
                    logline,
                    acts,
                    characters,
                },
                characters,
            };

            // Call PATCH API
            const res = await fetch(`/api/story/${story.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    premise,
                    genre,
                    status: story.status,
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

            onSave(data.story || updatedStory);
        } catch (error: any) {
            console.error("Save story error:", error);
            toast({
                title: "保存失败",
                description: error.message,
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
        setActs(acts.filter((_: any, i: number) => i !== index));
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
        setCharacters(characters.filter((_: any, i: number) => i !== index));
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
                        <Label htmlFor="premise">故事前提 *</Label>
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
                        {acts.map((act: any, idx: number) => (
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
                        {characters.map((char: any, idx: number) => (
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
