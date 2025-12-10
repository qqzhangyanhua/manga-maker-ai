"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
    ArrowLeft, Loader2, Save, Plus, Trash2, Image as ImageIcon,
    MoreHorizontal, Edit, RefreshCw
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Story {
    id: string;
    title: string;
    genre: string;
    premise: string;
    status: string;
    outline: any;
    characters: any[];
    updated_at: string;
}

interface Panel {
    id: string;
    project_id: string;
    panel_order: number;
    description: string;
    panel_type: string;
    importance: string;
    camera_angle?: string;
    shot_size?: string;
    dialogue?: string;
    character_name?: string;
    emotion?: string;
    visual_prompt: string;
    image_url?: string;
}

export default function ScriptDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [story, setStory] = useState<Story | null>(null);
    const [panels, setPanels] = useState<Panel[]>([]);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Panel editing state
    const [editingPanel, setEditingPanel] = useState<Panel | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Story editing state
    const [editMode, setEditMode] = useState(false);
    const [storyForm, setStoryForm] = useState({ title: "", premise: "" });

    useEffect(() => {
        if (params.id) {
            fetchStoryAndPanels(params.id as string);
        }
    }, [params.id]);

    async function fetchStoryAndPanels(id: string) {
        try {
            setLoading(true);

            // Fetch story
            const storyRes = await fetch(`/api/story/${id}`);
            if (!storyRes.ok) throw new Error("Failed to load story");
            const storyData = await storyRes.json();
            setStory(storyData.story);
            setStoryForm({
                title: storyData.story.title,
                premise: storyData.story.premise || ""
            });

            // Fetch panels
            const panelsRes = await fetch(`/api/story/${id}/panels`);
            if (!panelsRes.ok) throw new Error("Failed to load panels");
            const panelsData = await panelsRes.json();
            setPanels(panelsData.panels || []);
            setProjectId(panelsData.projectId);

        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "加载数据失败",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdateStory() {
        if (!story) return;
        try {
            setSaving(true);
            const res = await fetch(`/api/story/${story.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(storyForm),
            });

            if (!res.ok) throw new Error("Failed to update");

            setStory({ ...story, ...storyForm });
            setEditMode(false);
            toast({ title: "剧本已保存" });
        } catch (error) {
            toast({
                title: "保存失败",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    }

    async function handleSavePanel(e: React.FormEvent) {
        e.preventDefault();
        if (!projectId) return;

        try {
            const isNew = !editingPanel?.id;
            const url = isNew ? "/api/panel" : `/api/panel/${editingPanel.id}`;
            const method = isNew ? "POST" : "PATCH";

            const body = {
                ...editingPanel,
                project_id: projectId,
                // If it's new, panel_order handles itself on backend usually or we verify
            };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error("Operation failed");

            const data = await res.json();

            if (isNew) {
                setPanels([...panels, data.panel]);
            } else {
                setPanels(panels.map(p => p.id === data.panel.id ? data.panel : p));
            }

            setIsDialogOpen(false);
            setEditingPanel(null);
            toast({ title: isNew ? "分镜已创建" : "分镜已更新" });

        } catch (error) {
            toast({
                title: "操作失败",
                variant: "destructive",
            });
        }
    }

    async function handleDeletePanel(id: string) {
        if (!confirm("确定要删除这个分镜吗？")) return;

        try {
            const res = await fetch(`/api/panel/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Delete failed");

            setPanels(panels.filter(p => p.id !== id));
            toast({ title: "分镜已删除" });
        } catch (error) {
            toast({ title: "删除失败", variant: "destructive" });
        }
    }

    function openNewPanelDialog() {
        setEditingPanel({
            project_id: projectId || "",
            description: "",
            panel_type: "medium",
            importance: "medium",
            camera_angle: "eye_level",
            shot_size: "medium_shot",
            dialogue: "",
            character_name: "",
            emotion: "",
            visual_prompt: "",
        } as Panel);
        setIsDialogOpen(true);
    }

    function openEditPanelDialog(panel: Panel) {
        setEditingPanel({ ...panel });
        setIsDialogOpen(true);
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!story) {
        return (
            <div className="container py-8 text-center">
                <h1 className="text-2xl font-bold">未找到剧本</h1>
                <Button className="mt-4" onClick={() => router.push("/scripts")}>
                    返回列表
                </Button>
            </div>
        );
    }

    return (
        <div className="container py-8 space-y-8">
            {/* Header / Navigation */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/scripts")}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{story.title}</h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{story.genre}</Badge>
                        <span>Updated: {format(new Date(story.updated_at), "yyyy-MM-dd HH:mm")}</span>
                    </div>
                </div>
                <div className="ml-auto flex gap-2">
                    {editMode ? (
                        <>
                            <Button variant="outline" onClick={() => setEditMode(false)}>
                                取消
                            </Button>
                            <Button onClick={handleUpdateStory} disabled={saving}>
                                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                保存修改
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" onClick={() => setEditMode(true)}>
                            <Edit className="w-4 h-4 mr-2" />
                            编辑剧本信息
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Script Details */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>剧本信息</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>标题</Label>
                                {editMode ? (
                                    <Input
                                        value={storyForm.title}
                                        onChange={e => setStoryForm({ ...storyForm, title: e.target.value })}
                                    />
                                ) : (
                                    <p className="font-medium">{story.title}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>创意前提 / 梗概</Label>
                                {editMode ? (
                                    <Textarea
                                        value={storyForm.premise}
                                        onChange={e => setStoryForm({ ...storyForm, premise: e.target.value })}
                                        rows={6}
                                    />
                                ) : (
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {story.premise}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Character / Roles List (Read only for now) */}
                    <Card>
                        <CardHeader>
                            <CardTitle>角色列表</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {story.characters?.map((char: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-muted/50 rounded-lg text-sm">
                                        <p className="font-bold">{char.name}</p>
                                        <p className="text-muted-foreground mt-1">{char.role}: {char.description}</p>
                                    </div>
                                ))}
                                {(!story.characters || story.characters.length === 0) && (
                                    <p className="text-sm text-muted-foreground">无角色信息</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Shots / Panels Management */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <ImageIcon className="w-5 h-5" />
                            分镜列表 ({panels.length})
                        </h2>
                        <Button onClick={openNewPanelDialog} disabled={!projectId}>
                            <Plus className="w-4 h-4 mr-2" />
                            添加分镜
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {panels.length === 0 ? (
                            <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
                                <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">暂无分镜 (镜头)</p>
                                <Button variant="link" onClick={openNewPanelDialog} disabled={!projectId}>
                                    立即添加
                                </Button>
                            </div>
                        ) : (
                            panels.map((panel, index) => (
                                <Card key={panel.id} className="group hover:border-primary/50 transition-colors">
                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">Shot #{index + 1}</Badge>
                                            <Badge variant="outline">{panel.shot_size}</Badge>
                                            <Badge variant="outline">{panel.camera_angle}</Badge>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditPanelDialog(panel)}>
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    编辑
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() => handleDeletePanel(panel.id)}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    删除
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">画面描述</Label>
                                                <p className="text-sm">{panel.description || "无描述"}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground">对白</Label>
                                                <p className="text-sm italic text-muted-foreground">
                                                    {panel.character_name ? `${panel.character_name}: ` : ""}
                                                    {panel.dialogue || "无对白"}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                    {panel.image_url && (
                                        <CardFooter className="bg-muted/10 p-0 overflow-hidden rounded-b-lg">
                                            <div className="w-full h-32 relative">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={panel.image_url}
                                                    alt="Shot preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </CardFooter>
                                    )}
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Edit/Create Panel Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingPanel?.id ? "编辑分镜" : "新建分镜"}</DialogTitle>
                        <DialogDescription>
                            配置分镜画面的详细参数
                        </DialogDescription>
                    </DialogHeader>

                    {editingPanel && (
                        <form onSubmit={handleSavePanel} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>景别 (Shot Size)</Label>
                                    <Select
                                        value={editingPanel.shot_size}
                                        onValueChange={v => setEditingPanel({ ...editingPanel, shot_size: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择景别" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="extreme_closeup">特写 (Extreme Close-up)</SelectItem>
                                            <SelectItem value="closeup">近景 (Close-up)</SelectItem>
                                            <SelectItem value="medium_shot">中景 (Medium Shot)</SelectItem>
                                            <SelectItem value="full_shot">全景 (Full Shot)</SelectItem>
                                            <SelectItem value="long_shot">远景 (Long Shot)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>视角 (Camera Angle)</Label>
                                    <Select
                                        value={editingPanel.camera_angle}
                                        onValueChange={v => setEditingPanel({ ...editingPanel, camera_angle: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择视角" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="eye_level">平视 (Eye Level)</SelectItem>
                                            <SelectItem value="high_angle">俯视 (High Angle)</SelectItem>
                                            <SelectItem value="low_angle">仰视 (Low Angle)</SelectItem>
                                            <SelectItem value="dutch_angle">荷兰角 (Dutch Angle)</SelectItem>
                                            <SelectItem value="bird_eye">鸟瞰 (Bird's Eye)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>画面描述</Label>
                                <Textarea
                                    placeholder="描述画面中发生了什么..."
                                    value={editingPanel.description}
                                    onChange={e => setEditingPanel({ ...editingPanel, description: e.target.value })}
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>角色</Label>
                                    <Input
                                        placeholder="角色名称"
                                        value={editingPanel.character_name || ""}
                                        onChange={e => setEditingPanel({ ...editingPanel, character_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>情感/表情</Label>
                                    <Input
                                        placeholder="例如: 惊讶, 愤怒"
                                        value={editingPanel.emotion || ""}
                                        onChange={e => setEditingPanel({ ...editingPanel, emotion: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>重要性</Label>
                                    <Select
                                        value={editingPanel.importance}
                                        onValueChange={v => setEditingPanel({ ...editingPanel, importance: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">低</SelectItem>
                                            <SelectItem value="medium">中</SelectItem>
                                            <SelectItem value="high">高</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>对白 (可选)</Label>
                                <Textarea
                                    placeholder="角色说的话..."
                                    value={editingPanel.dialogue || ""}
                                    onChange={e => setEditingPanel({ ...editingPanel, dialogue: e.target.value })}
                                    rows={2}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    取消
                                </Button>
                                <Button type="submit">
                                    保存
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
