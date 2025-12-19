"use client";

import { useEffect, useState } from "react";
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
import { Palette, Plus, Edit2, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Upload, Loader2 } from "lucide-react";
import { ComicStyle, PRESET_COLORS } from "./types";
import { useComicStyleList } from "./hooks/useComicStyleList";
import { useComicStyleForm } from "./hooks/useComicStyleForm";

const ComicStylesAdminPage = () => {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const isAdmin = (currentUser?.role || "user") === "admin";

  const [deletingStyle, setDeletingStyle] = useState<ComicStyle | null>(null);

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
    fileInputRef,
    handleOpenDialog,
    handleSubmit,
    handleFileSelect,
    triggerFileInput,
  } = useComicStyleForm(styles.length, fetchStyles);

  useEffect(() => {
    if (isAdmin) {
      fetchStyles();
    }
  }, [isAdmin, fetchStyles]);

  const handleDelete = (style: ComicStyle) => {
    setDeletingStyle(style);
  };

  const confirmDelete = async () => {
    if (!deletingStyle) return;

    try {
      const res = await fetch(`/api/admin/comic-styles/${deletingStyle.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("删除失败");

      toast({ title: "删除成功" });
      fetchStyles();
    } catch (error) {
      toast({ title: "删除失败", variant: "destructive" });
    } finally {
      setDeletingStyle(null);
    }
  };

  if (userLoading) {
    return <div className="p-10">加载中...</div>;
  }

  if (!isAdmin) {
    return <div className="p-10">权限不足，需要管理员角色。</div>;
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
          <div className="flex items-center justify-end">
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
                              className="w-16 h-16 object-cover rounded-md border border-border"
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
                        className="w-full h-full object-cover rounded-lg border border-border"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={triggerFileInput}
                      disabled={uploading}
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
                    <span className="text-xs text-muted-foreground">或</span>
                    <Input
                      value={form.image_url}
                      onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                      placeholder="输入图片 URL"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    支持 JPG、PNG、WebP 格式，最大 4MB
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
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default ComicStylesAdminPage;
