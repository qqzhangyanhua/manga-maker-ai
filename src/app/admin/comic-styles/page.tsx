"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Palette, Plus, Edit2, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Upload, Loader2, Sparkles, Download } from "lucide-react";
import { ComicStyle, PRESET_COLORS } from "./types";
import { useComicStyleList } from "./hooks/useComicStyleList";
import { useComicStyleForm } from "./hooks/useComicStyleForm";

const ComicStylesAdminPage = () => {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = (currentUser?.role || "user") === "admin";

  const [deletingStyle, setDeletingStyle] = useState<ComicStyle | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const { styles, loading, fetchStyles, handleToggleEnabled, handleSortChange } =
    useComicStyleList();

  const {
    dialogOpen,
    setDialogOpen,
    editingStyle,
    form,
    setForm,
    submitting,
    uploading,
    generating,
    fileInputRef,
    handleOpenDialog,
    handleSubmit,
    handleFileSelect,
    handleGenerateImage,
    triggerFileInput,
  } = useComicStyleForm(styles.length, fetchStyles);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (styleId: string) => {
      const res = await fetch(`/api/admin/comic-styles/${styleId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "删除失败" }));
        throw new Error(data.message || "删除失败");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({ title: "删除成功" });
      queryClient.invalidateQueries({ queryKey: ["admin-comic-styles"] });
      setDeletingStyle(null);
    },
    onError: () => {
      toast({ title: "删除失败", variant: "destructive" });
    },
  });

  const handleDelete = (style: ComicStyle) => {
    setDeletingStyle(style);
  };

  const confirmDelete = () => {
    if (!deletingStyle) return;
    deleteMutation.mutate(deletingStyle.id);
  };

  const handleExportJSON = () => {
    const exportData = styles.map((style) => ({
      id: style.id,
      style_key: style.style_key,
      name_zh: style.name_zh,
      name_en: style.name_en,
      image_url: style.image_url,
      tag_color: style.tag_color,
      description: style.description,
      prompt_prefix: style.prompt_prefix,
      sort_order: style.sort_order,
      enabled: style.enabled,
      usage_count: style.usage_count,
      created_at: style.created_at,
      updated_at: style.updated_at,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comic-styles-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "导出成功", description: `已导出 ${styles.length} 个风格` });
  };

  const handleExportCSV = () => {
    const headers = [
      "ID",
      "风格标识",
      "中文名称",
      "英文名称",
      "图片URL",
      "标签颜色",
      "描述",
      "AI提示词前缀",
      "排序",
      "启用状态",
      "使用次数",
      "创建时间",
      "更新时间",
    ];

    const rows = styles.map((style) => [
      style.id,
      style.style_key,
      style.name_zh,
      style.name_en,
      style.image_url || "",
      style.tag_color,
      style.description || "",
      style.prompt_prefix || "",
      style.sort_order,
      style.enabled ? "启用" : "禁用",
      style.usage_count,
      style.created_at ? new Date(style.created_at).toLocaleString("zh-CN") : "",
      style.updated_at ? new Date(style.updated_at).toLocaleString("zh-CN") : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell);
            if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comic-styles-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "导出成功", description: `已导出 ${styles.length} 个风格` });
  };

  const handleBatchGenerateImages = async () => {
    const stylesWithoutImages = styles.filter(
      (style) => !style.image_url && style.prompt_prefix
    );

    if (stylesWithoutImages.length === 0) {
      toast({
        title: "没有需要生成图片的风格",
        description: "所有风格都已有图片,或缺少 AI 提示词前缀",
      });
      return;
    }

    const confirmed = confirm(
      `将为 ${stylesWithoutImages.length} 个风格生成图片,这可能需要一些时间。是否继续?`
    );

    if (!confirmed) return;

    setBatchGenerating(true);
    let successCount = 0;
    let failCount = 0;

    for (const style of stylesWithoutImages) {
      try {
        const generationPrompt = `${style.prompt_prefix}, high quality, professional comic book style illustration, vibrant colors, clean lines, ${style.name_zh} art style`;

        const res = await fetch("/api/image-generation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: generationPrompt,
            negative_prompt:
              "low quality, blurry, distorted, ugly, bad anatomy, watermark, text, signature",
            width: 512,
            height: 512,
            steps: 30,
            cfg_scale: 7,
            type: "comic-style",
            metadata: {
              style_name: style.name_zh,
              style_key: style.style_key,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.image_url) {
            await fetch(`/api/admin/comic-styles/${style.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image_url: data.image_url }),
            });
            successCount++;
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Failed to generate image for ${style.name_zh}:`, error);
        failCount++;
      }
    }

    setBatchGenerating(false);
    queryClient.invalidateQueries({ queryKey: ["admin-comic-styles"] });
    fetchStyles();

    toast({
      title: "批量生成完成",
      description: `成功: ${successCount}, 失败: ${failCount}`,
    });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">权限不足，需要管理员角色。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen halftone-pattern">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="relative">
          <div className="absolute -left-4 -top-4 w-20 h-20 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse" />
          <h1 className="text-5xl font-bold mb-4 flex items-center gap-3 comic-title relative z-10">
            <Palette className="w-12 h-12 text-primary drop-shadow-md" />
            漫画风格管理
          </h1>
          <p className="text-xl text-muted-foreground font-medium pl-2 border-l-4 border-primary/50">
            管理首页展示的漫画风格，支持新增、编辑、排序和启用/禁用。
          </p>
        </div>

        <div className="p-5 comic-card bg-card space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {styles.filter((s) => !s.image_url && s.prompt_prefix).length > 0 && (
                <Button
                  onClick={handleBatchGenerateImages}
                  disabled={loading || batchGenerating}
                  variant="outline"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600"
                >
                  {batchGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      批量生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      批量生成图片 ({styles.filter((s) => !s.image_url && s.prompt_prefix).length})
                    </>
                  )}
                </Button>
              )}
              {styles.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleExportJSON}
                    disabled={loading}
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    导出 JSON
                  </Button>
                  <Button
                    onClick={handleExportCSV}
                    disabled={loading}
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    导出 CSV
                  </Button>
                </div>
              )}
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <Plus className="w-4 h-4 mr-1" />
              新增风格
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-10">加载中...</div>
          ) : styles.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              暂无风格数据，点击"新增风格"开始添加。
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">预览</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">名称</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">标识</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">排序</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">使用次数</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {styles.map((style, index) => (
                    <tr key={style.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {style.image_url ? (
                            <img
                              src={style.image_url}
                              alt={style.name_zh}
                              className="w-16 h-16 object-cover rounded-md border border-border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                              onClick={() => setPreviewImage({ url: style.image_url, name: style.name_zh })}
                            />
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                              <Palette className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${style.tag_color}`}
                          >
                            {style.name_en}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{style.name_zh}</div>
                        <div className="text-xs text-muted-foreground">{style.name_en}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">{style.style_key}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSortChange(style, "up")}
                            disabled={index === 0}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <span className="text-sm">{style.sort_order}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSortChange(style, "down")}
                            disabled={index === styles.length - 1}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => handleToggleEnabled(style)}>
                          {style.enabled ? (
                            <>
                              <Eye className="w-4 h-4 mr-1" />
                              启用
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-4 h-4 mr-1" />
                              禁用
                            </>
                          )}
                        </Button>
                      </td>
                      <td className="px-4 py-3 text-center">{style.usage_count}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(style)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(style)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStyle ? "编辑风格" : "新增风格"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>风格标识*</Label>
                <Input
                  value={form.style_key}
                  onChange={(e) => setForm({ ...form, style_key: e.target.value })}
                  placeholder="manga"
                  disabled={!!editingStyle}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  小写字母、数字和下划线，创建后不可修改
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>中文名称*</Label>
                  <Input
                    value={form.name_zh}
                    onChange={(e) => setForm({ ...form, name_zh: e.target.value })}
                    placeholder="日式漫画"
                  />
                </div>
                <div>
                  <Label>英文名称*</Label>
                  <Input
                    value={form.name_en}
                    onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                    placeholder="MANGA"
                  />
                </div>
              </div>

              <div>
                <Label>风格图片*</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="mt-2 space-y-3">
                  {form.image_url && (
                    <div className="relative w-32 h-32">
                      <img
                        src={form.image_url}
                        alt="预览"
                        className="w-full h-full object-cover rounded-lg border border-border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                        onClick={() => setPreviewImage({ url: form.image_url, name: form.name_zh || "预览" })}
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={triggerFileInput}
                      disabled={uploading || generating}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          上传中...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          上传图片
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateImage}
                      disabled={uploading || generating || !form.name_zh || !form.prompt_prefix}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          AI 生成
                        </>
                      )}
                    </Button>
                    <span className="text-xs text-muted-foreground">或</span>
                    <Input
                      value={form.image_url}
                      onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                      placeholder="输入图片 URL"
                      className="flex-1"
                      disabled={uploading || generating}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    支持 JPG、PNG、WebP 格式，最大 4MB。AI 生成需先填写"中文名称"和"AI 提示词前缀"。
                  </p>
                </div>
              </div>

              <div>
                <Label>标签颜色</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setForm({ ...form, tag_color: color.value })}
                      className={`px-3 py-2 rounded text-sm font-semibold ${color.value} ${form.tag_color === color.value ? "ring-2 ring-primary" : ""
                        }`}
                    >
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>描述（可选）</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="经典的日式漫画风格..."
                  rows={3}
                />
              </div>

              <div>
                <Label>AI 提示词前缀（可选）</Label>
                <Input
                  value={form.prompt_prefix}
                  onChange={(e) => setForm({ ...form, prompt_prefix: e.target.value })}
                  placeholder="japanese manga style, anime art"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>排序权重</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">数字越小越靠前</p>
                </div>
                <div>
                  <Label>启用状态</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={form.enabled}
                        onChange={() => setForm({ ...form, enabled: true })}
                      />
                      <span>启用</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!form.enabled}
                        onChange={() => setForm({ ...form, enabled: false })}
                      />
                      <span>禁用</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  取消
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "提交中..." : editingStyle ? "保存" : "创建"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!deletingStyle}
          onOpenChange={(open) => !open && setDeletingStyle(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除风格</AlertDialogTitle>
              <AlertDialogDescription>
                {deletingStyle && (
                  <>
                    确定要删除风格 <strong>&quot;{deletingStyle.name_zh}&quot;</strong> 吗？
                    <br />
                    此操作不可恢复。
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "删除中..." : "删除"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewImage?.name} - 风格预览</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-4">
              {previewImage && (
                <img
                  src={previewImage.url}
                  alt={previewImage.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ComicStylesAdminPage;
