"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, MapPin, Trash2, Sparkles, Loader2, MoreHorizontal, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  // Form state
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
      if (!response.ok) throw new Error("获取场景列表失败");
      return response.json();
    },
  });

  // Mutations (Create, Update, Delete)
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
      toast({ title: "创建成功", description: "场景已添加到库中" });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => toast({ title: "创建失败", description: error.message, variant: "destructive" }),
  });

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
      toast({ title: "更新成功", description: "场景信息已保存" });
      setEditDialogOpen(false);
      setEditingScene(null);
      resetForm();
    },
    onError: (error: Error) => toast({ title: "更新失败", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/scene/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "删除场景失败");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenes"] });
      toast({ title: "删除成功", description: "场景已从库中移除" });
      setDeletingScene(null);
    },
    onError: (error: Error) => toast({ title: "删除失败", description: error.message, variant: "destructive" }),
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

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.scene_type) {
      toast({ title: "请填写必填项", description: "场景名称和类型是必填的", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScene) return;
    if (!formData.name || !formData.scene_type) {
      toast({ title: "请填写必填项", description: "场景名称和类型是必填的", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ id: editingScene.id, data: formData });
  };

  const getSceneTypeLabel = (type: string) => {
    return sceneTypes.find((st) => st.value === type)?.label || type;
  };
  
  const getSceneTypeIcon = (type: string) => {
    return sceneTypes.find((st) => st.value === type)?.icon || "📍";
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
           {/* Future Filters */}
        </div>
        <Button size="sm" onClick={handleCreateNew} className="bg-white text-black hover:bg-zinc-200">
          <Plus className="w-4 h-4 mr-2" />
          创建新场景
        </Button>
      </div>

      {/* Scene Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Create Card */}
        <GlassCard 
          className="group relative flex flex-col items-center justify-center gap-4 min-h-[200px] aspect-video cursor-pointer border-dashed border-2 border-zinc-800 hover:border-orange-500/50 bg-zinc-900/20 hover:bg-zinc-900/40 transition-all duration-300"
          onClick={handleCreateNew}
        >
          <div className="w-14 h-14 rounded-full bg-zinc-800/50 flex items-center justify-center group-hover:bg-orange-500/20 group-hover:text-orange-500 transition-colors">
            <Plus className="w-7 h-7 text-zinc-500 group-hover:text-orange-500 transition-colors" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-zinc-300 group-hover:text-white transition-colors">创建新场景</p>
            <p className="text-xs text-zinc-500 mt-1">上传或 AI 生成背景</p>
          </div>
        </GlassCard>

        {isLoading ? (
          // Loading Skeletons
          Array.from({ length: 3 }).map((_, i) => (
             <div key={i} className="rounded-xl bg-zinc-900/50 border border-zinc-800 aspect-video p-3 space-y-3">
                <Skeleton className="w-full h-full rounded-lg bg-zinc-800" />
              </div>
          ))
        ) : (
          scenes?.map((scene) => (
            <GlassCard
              key={scene.id}
              className={cn(
                "group relative p-0 overflow-hidden cursor-pointer aspect-video hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-500",
                selectedScene === scene.id && "ring-1 ring-orange-500"
              )}
              onClick={() => setSelectedScene(scene.id)}
            >
              {/* Image */}
              <div className="w-full h-full relative bg-zinc-900">
                {scene.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={scene.image_url}
                    alt={scene.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
                    <ImageIcon className="w-12 h-12 opacity-20" />
                  </div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2 z-10">
                  <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/40 backdrop-blur-md text-zinc-300 border border-white/10 flex items-center gap-1">
                    <span>{getSceneTypeIcon(scene.scene_type)}</span>
                    <span>{getSceneTypeLabel(scene.scene_type)}</span>
                  </span>
                  {scene.is_ai_generated && (
                    <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 backdrop-blur-md text-orange-400 border border-orange-500/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> AI
                    </span>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-20">
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/10" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32 bg-zinc-900 border-zinc-800 text-zinc-300">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); /* handle use */ }}>
                        <Sparkles className="w-4 h-4 mr-2" /> 使用
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(scene); }}>
                        <Edit2 className="w-4 h-4 mr-2" /> 编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                        onClick={(e) => { e.stopPropagation(); setDeletingScene(scene); }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> 删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Content Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-orange-400 transition-colors line-clamp-1">
                    {scene.name}
                  </h3>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-zinc-400 line-clamp-1 flex-1 mr-4">
                      {scene.description || "暂无描述"}
                    </p>
                    <div className="text-[10px] text-zinc-500 font-mono whitespace-nowrap">
                      USED {scene.usage_count}
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {/* Dialogs (Create/Edit/Delete) - Styles updated to match dark theme */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-white">创建新场景</DialogTitle>
            <DialogDescription className="text-zinc-400">添加新的场景到您的资产库</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300">场景名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例: 温馨咖啡厅"
                className="bg-zinc-800 border-zinc-700 focus:border-orange-500/50"
              />
            </div>
            {/* ... other fields with similar styling ... */}
            <div className="space-y-2">
              <Label htmlFor="scene_type" className="text-zinc-300">场景类型 *</Label>
              <Select
                value={formData.scene_type}
                onValueChange={(value) => setFormData({ ...formData, scene_type: value })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  {sceneTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="focus:bg-zinc-700 focus:text-white">
                      <span className="flex items-center gap-2">{type.icon} {type.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label htmlFor="description" className="text-zinc-300">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-zinc-800 border-zinc-700 min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image_url" className="text-zinc-300">图片URL</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                取消
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-orange-500 hover:bg-orange-600 text-white">
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                创建
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

       {/* Edit Dialog - Similar styling */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-white">编辑场景</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit} className="space-y-4">
             {/* Fields same as create but pre-filled */}
             <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-zinc-300">场景名称 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-scene_type" className="text-zinc-300">场景类型 *</Label>
              <Select
                value={formData.scene_type}
                onValueChange={(value) => setFormData({ ...formData, scene_type: value })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-200">
                  {sceneTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="focus:bg-zinc-700 focus:text-white">
                      <span className="flex items-center gap-2">{type.icon} {type.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-zinc-300">描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-image_url" className="text-zinc-300">图片URL</Label>
              <Input
                id="edit-image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                取消
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} className="bg-orange-500 hover:bg-orange-600 text-white">
                {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingScene} onOpenChange={(open) => !open && setDeletingScene(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">确认删除场景?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if(deletingScene) deleteMutation.mutate(deletingScene.id) }} className="bg-red-600 hover:bg-red-700 text-white border-0">
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SceneLibrary;
