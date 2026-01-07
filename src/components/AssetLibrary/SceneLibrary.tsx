"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, MapPin, Trash2, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Scene = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  scene_type: string;
  image_url: string | null;
  tags: string[];
  prompt: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
  source_chapter_id: string | null;
  source_novel_id: string | null;
  is_ai_generated: boolean;
  generation_cost: number;
  generation_params: any;
};

const sceneTypes = [
  { value: "indoor", label: "室内", icon: "🏠" },
  { value: "outdoor", label: "室外", icon: "🌳" },
  { value: "urban", label: "城市", icon: "🏙️" },
  { value: "nature", label: "自然", icon: "🌲" },
  { value: "fantasy", label: "奇幻", icon: "✨" },
  { value: "scifi", label: "科幻", icon: "🚀" },
  { value: "historical", label: "历史", icon: "🏛️" },
  { value: "abstract", label: "抽象", icon: "🎨" },
];

const SceneLibrary = () => {
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [deletingScene, setDeletingScene] = useState<Scene | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    scene_type: "indoor",
    image_url: "",
    tags: "",
    prompt: "",
  });

  // Fetch scenes
  const { data: scenes, isLoading } = useQuery<Scene[]>({
    queryKey: ["scenes"],
    queryFn: async () => {
      const response = await fetch("/api/scene");
      if (!response.ok) {
        throw new Error("获取场景列表失败");
      }
      return response.json();
    },
  });

  // Create scene mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          tags: data.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "创建场景失败");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenes"] });
      toast({
        title: "创建成功",
        description: "场景已添加到库中",
      });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "创建失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update scene mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const response = await fetch(`/api/scene/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "更新场景失败");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenes"] });
      toast({
        title: "更新成功",
        description: "场景信息已保存",
      });
      setEditDialogOpen(false);
      setEditingScene(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "更新失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete scene mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/scene/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "删除场景失败");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenes"] });
      toast({
        title: "删除成功",
        description: "场景已从库中移除",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "删除失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      scene_type: "indoor",
      image_url: "",
      tags: "",
      prompt: "",
    });
  };

  const handleCreateNew = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleEdit = (scene: Scene) => {
    setEditingScene(scene);
    setFormData({
      name: scene.name,
      description: scene.description || "",
      scene_type: scene.scene_type,
      image_url: scene.image_url || "",
      tags: scene.tags.join(", "),
      prompt: scene.prompt || "",
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (scene: Scene) => {
    setDeletingScene(scene);
  };

  const confirmDelete = () => {
    if (!deletingScene) return;
    deleteMutation.mutate(deletingScene.id);
    setDeletingScene(null);
  };

  const handleUseScene = (scene: Scene) => {
    toast({
      title: `已选择 ${scene.name}`,
      description: "场景已添加到当前创作中",
    });
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.scene_type) {
      toast({
        title: "请填写必填项",
        description: "场景名称和类型是必填的",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScene) return;
    if (!formData.name || !formData.scene_type) {
      toast({
        title: "请填写必填项",
        description: "场景名称和类型是必填的",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ id: editingScene.id, data: formData });
  };

  const getSceneTypeLabel = (type: string) => {
    return sceneTypes.find((st) => st.value === type)?.label || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-comic text-2xl text-foreground">场景记忆库</h2>
          <p className="text-muted-foreground">
            保存场景设定，保持故事中场景的一致性
          </p>
        </div>
        <Button variant="comic" onClick={handleCreateNew}>
          <Plus className="w-4 h-4" />
          创建新场景
        </Button>
      </div>

      {/* Scene Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenes?.map((scene) => (
          <div
            key={scene.id}
            className={cn(
              "comic-card group cursor-pointer transition-all duration-300",
              selectedScene === scene.id && "ring-2 ring-primary"
            )}
            onClick={() => setSelectedScene(scene.id)}
          >
            {/* Image */}
            <div className="aspect-video relative overflow-hidden rounded-t-lg bg-muted">
              {scene.image_url ? (
                <>
                  <img
                    src={scene.image_url}
                    alt={scene.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="w-16 h-16 text-muted-foreground" />
                </div>
              )}

              {/* Scene Type Tag */}
              <div className="absolute top-3 left-3 flex gap-2">
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-background/80 text-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {getSceneTypeLabel(scene.scene_type)}
                </span>
                {scene.is_ai_generated && (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-500/80 text-white flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI生成
                  </span>
                )}
              </div>

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="comic"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUseScene(scene);
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  使用
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(scene);
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(scene);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-comic text-xl text-foreground mb-1">{scene.name}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {scene.description || "暂无描述"}
              </p>

              {/* Tags */}
              {scene.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {scene.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                  {scene.tags.length > 3 && (
                    <span className="px-2 py-0.5 rounded text-xs text-muted-foreground">
                      +{scene.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>使用次数: {scene.usage_count}</span>
                {scene.is_ai_generated && scene.generation_cost > 0 && (
                  <span className="text-orange-500">💰 {scene.generation_cost} 算力</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Add New Card */}
        <button
          onClick={handleCreateNew}
          className="comic-card min-h-[200px] flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border hover:border-primary transition-colors"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">创建新场景</p>
            <p className="text-sm text-muted-foreground">保存场景设定</p>
          </div>
        </button>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>创建新场景</DialogTitle>
            <DialogDescription>添加新的场景到您的资产库</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCreate} className="space-y-4">
            <div>
              <Label htmlFor="name">场景名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例: 温馨咖啡厅"
              />
            </div>
            <div>
              <Label htmlFor="scene_type">场景类型 *</Label>
              <Select
                value={formData.scene_type}
                onValueChange={(value) => setFormData({ ...formData, scene_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sceneTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="描述场景的特点和氛围"
              />
            </div>
            <div>
              <Label htmlFor="image_url">图片URL</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="tags">标签（用逗号分隔）</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="咖啡厅, 温馨, 现代"
              />
            </div>
            <div>
              <Label htmlFor="prompt">AI提示词</Label>
              <Textarea
                id="prompt"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder="用于生成该场景的AI提示词"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                创建
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑场景</DialogTitle>
            <DialogDescription>修改场景信息</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">场景名称 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-scene_type">场景类型 *</Label>
              <Select
                value={formData.scene_type}
                onValueChange={(value) => setFormData({ ...formData, scene_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sceneTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-description">描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-image_url">图片URL</Label>
              <Input
                id="edit-image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-tags">标签（用逗号分隔）</Label>
              <Input
                id="edit-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-prompt">AI提示词</Label>
              <Textarea
                id="edit-prompt"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingScene} onOpenChange={(open) => !open && setDeletingScene(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除场景</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingScene && (
                <>
                  确定要删除场景 <strong>&quot;{deletingScene.name}&quot;</strong> 吗？
                  <br />
                  此操作不可恢复。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SceneLibrary;
