"use client";

import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Palette, Plus, Edit2, Trash2, ChevronUp, ChevronDown, Eye, EyeOff } from "lucide-react";

interface ComicStyle {
  id: string;
  style_key: string;
  name_zh: string;
  name_en: string;
  image_url: string;
  tag_color: string;
  description: string | null;
  prompt_prefix: string | null;
  sort_order: number;
  enabled: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

const PRESET_COLORS = [
  { name: "粉色", value: "bg-comic-pink text-background" },
  { name: "红色", value: "bg-comic-red text-foreground" },
  { name: "蓝色", value: "bg-comic-blue text-background" },
  { name: "紫色", value: "bg-comic-purple text-foreground" },
  { name: "绿色", value: "bg-comic-green text-background" },
  { name: "橙色", value: "bg-comic-orange text-background" },
  { name: "主题色", value: "bg-primary text-background" },
];

const ComicStylesAdminPage = () => {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const isAdmin = (currentUser?.role || "user") === "admin";

  const [styles, setStyles] = useState<ComicStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<ComicStyle | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    style_key: "",
    name_zh: "",
    name_en: "",
    image_url: "",
    tag_color: "bg-primary text-background",
    description: "",
    prompt_prefix: "",
    sort_order: 0,
    enabled: true,
  });

  const fetchStyles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/comic-styles");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setStyles(data.data || []);
    } catch (error) {
      toast({ title: "加载失败", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchStyles();
    }
  }, [isAdmin]);

  const handleOpenDialog = (style?: ComicStyle) => {
    if (style) {
      setEditingStyle(style);
      setForm({
        style_key: style.style_key,
        name_zh: style.name_zh,
        name_en: style.name_en,
        image_url: style.image_url,
        tag_color: style.tag_color,
        description: style.description || "",
        prompt_prefix: style.prompt_prefix || "",
        sort_order: style.sort_order,
        enabled: style.enabled,
      });
    } else {
      setEditingStyle(null);
      setForm({
        style_key: "",
        name_zh: "",
        name_en: "",
        image_url: "",
        tag_color: "bg-primary text-background",
        description: "",
        prompt_prefix: "",
        sort_order: styles.length,
        enabled: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.style_key || !form.name_zh || !form.name_en || !form.image_url) {
      toast({ title: "请填写所有必填项", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const url = editingStyle
        ? `/api/admin/comic-styles/${editingStyle.id}`
        : "/api/admin/comic-styles";

      const res = await fetch(url, {
        method: editingStyle ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "操作失败");
      }

      toast({ title: editingStyle ? "更新成功" : "创建成功" });
      setDialogOpen(false);
      fetchStyles();
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除风格"${name}"吗？此操作不可恢复。`)) return;

    try {
      const res = await fetch(`/api/admin/comic-styles/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("删除失败");

      toast({ title: "删除成功" });
      fetchStyles();
    } catch (error) {
      toast({ title: "删除失败", variant: "destructive" });
    }
  };

  const handleToggleEnabled = async (style: ComicStyle) => {
    try {
      const res = await fetch(`/api/admin/comic-styles/${style.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !style.enabled }),
      });

      if (!res.ok) throw new Error("切换失败");

      toast({ title: style.enabled ? "已禁用" : "已启用" });
      fetchStyles();
    } catch (error) {
      toast({ title: "操作失败", variant: "destructive" });
    }
  };

  const handleSortChange = async (style: ComicStyle, direction: "up" | "down") => {
    const newOrder = direction === "up" ? style.sort_order - 1 : style.sort_order + 1;

    try {
      const res = await fetch(`/api/admin/comic-styles/${style.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: newOrder }),
      });

      if (!res.ok) throw new Error("调整失败");

      fetchStyles();
    } catch (error) {
      toast({ title: "调整失败", variant: "destructive" });
    }
  };

  if (userLoading) {
    return <div className="p-10">加载中...</div>;
  }

  if (!isAdmin) {
    return <div className="p-10">权限不足，需要管理员角色。</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Palette className="w-7 h-7" />
            漫画风格管理
          </h1>
          <p className="text-muted-foreground">
            管理首页展示的漫画风格，支持新增、编辑、排序和启用/禁用。
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} disabled={loading}>
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
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${style.tag_color}`}>
                      {style.name_en}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleEnabled(style)}
                    >
                      {style.enabled ? (
                        <><Eye className="w-4 h-4 mr-1" />启用</>
                      ) : (
                        <><EyeOff className="w-4 h-4 mr-1" />禁用</>
                      )}
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-center">{style.usage_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(style)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(style.id, style.name_zh)}
                      >
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

      {/* 编辑/新增对话框 */}
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
              <Label>图片 URL*</Label>
              <Input
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="/assets/style-manga.jpg"
              />
            </div>

            <div>
              <Label>标签颜色</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setForm({ ...form, tag_color: color.value })}
                    className={`px-3 py-2 rounded text-sm font-semibold ${color.value} ${
                      form.tag_color === color.value ? "ring-2 ring-primary" : ""
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
    </div>
  );
};

export default ComicStylesAdminPage;
