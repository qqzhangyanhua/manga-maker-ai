"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  LayoutTemplate,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Star,
  StarOff,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { PanelTemplate, COMMON_TAGS } from "./types";
import { usePanelTemplateList } from "./hooks/usePanelTemplateList";
import { usePanelTemplateForm } from "./hooks/usePanelTemplateForm";

const PanelTemplatesAdminPage = () => {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const isAdmin = (currentUser?.role || "user") === "admin";

  const [deletingTemplate, setDeletingTemplate] = useState<PanelTemplate | null>(null);
  const [templateDataJson, setTemplateDataJson] = useState("");
  const [tagInput, setTagInput] = useState("");

  const { templates, loading, fetchTemplates, handleTogglePublic, handleToggleOfficial, handleDelete } =
    usePanelTemplateList();

  const {
    dialogOpen,
    setDialogOpen,
    editingTemplate,
    form,
    setForm,
    submitting,
    showAdvanced,
    setShowAdvanced,
    handleOpenDialog,
    handleSubmit: baseHandleSubmit,
  } = usePanelTemplateForm(fetchTemplates);

  useEffect(() => {
    if (isAdmin) {
      fetchTemplates();
    }
  }, [isAdmin, fetchTemplates]);

  useEffect(() => {
    if (dialogOpen) {
      setTemplateDataJson(JSON.stringify(form.template_data, null, 2));
      setTagInput("");
    }
  }, [dialogOpen, form.template_data]);

  const handleDeleteClick = (template: PanelTemplate) => {
    setDeletingTemplate(template);
  };

  const confirmDelete = async () => {
    if (!deletingTemplate) return;
    await handleDelete(deletingTemplate.id);
    setDeletingTemplate(null);
  };

  const handleSubmit = async () => {
    if (showAdvanced) {
      try {
        form.template_data = JSON.parse(templateDataJson);
      } catch (error) {
        toast({ title: "JSON 格式错误，请检查", variant: "destructive" });
        return;
      }
    }
    await baseHandleSubmit();
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !form.tags.includes(trimmed)) {
      setForm({ ...form, tags: [...form.tags, trimmed] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
  };

  const handleAddCommonTag = (tag: string) => {
    if (!form.tags.includes(tag)) {
      setForm({ ...form, tags: [...form.tags, tag] });
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
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        <div className="relative">
          <div className="absolute -left-4 -top-4 w-20 h-20 bg-blue-400 rounded-full blur-3xl opacity-20 animate-pulse" />
          <h1 className="text-5xl font-bold mb-4 flex items-center gap-3 comic-title relative z-10">
            <LayoutTemplate className="w-12 h-12 text-primary drop-shadow-md" />
            分镜模板管理
          </h1>
          <p className="text-xl text-muted-foreground font-medium pl-2 border-l-4 border-primary/50">
            管理分镜模板，支持新增、编辑官方模板和用户模板。
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
              新增模板
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-10">加载中...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              暂无模板数据，点击"新增模板"开始添加。
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">缩略图</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">模板名称</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">面板数</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">标签</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">官方</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">可见性</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">点赞/使用</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        {template.thumbnail_url ? (
                          <img
                            src={template.thumbnail_url}
                            alt={template.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                            <LayoutTemplate className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {template.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">{template.panel_count}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {template.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {template.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => handleToggleOfficial(template)}>
                          {template.is_official ? (
                            <>
                              <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                              官方
                            </>
                          ) : (
                            <>
                              <StarOff className="w-4 h-4 mr-1" />
                              非官方
                            </>
                          )}
                        </Button>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => handleTogglePublic(template)}>
                          {template.is_public ? (
                            <>
                              <Eye className="w-4 h-4 mr-1" />
                              公开
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-4 h-4 mr-1" />
                              私有
                            </>
                          )}
                        </Button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm">
                          {template.likes_count} / {template.usage_count}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(template)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(template)}
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
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "编辑模板" : "新增模板"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>模板名称*</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="经典9宫格"
                />
              </div>

              <div>
                <Label>描述（可选）</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="简短介绍这个模板..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>面板数量*</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={form.panel_count}
                    onChange={(e) =>
                      setForm({ ...form, panel_count: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
                <div>
                  <Label>缩略图 URL（可选）</Label>
                  <Input
                    value={form.thumbnail_url}
                    onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <Label>标签</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="输入标签后按回车"
                    />
                    <Button type="button" onClick={handleAddTag} variant="outline">
                      添加
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    常用标签：
                    <div className="flex flex-wrap gap-1 mt-1">
                      {COMMON_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleAddCommonTag(tag)}
                          className="px-2 py-1 text-xs bg-muted rounded hover:bg-muted/80"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_public}
                      onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                    />
                    <span>公开（所有人可见）</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_official}
                      onChange={(e) => setForm({ ...form, is_official: e.target.checked })}
                    />
                    <span>官方模板（显示官方标记）</span>
                  </label>
                </div>
              </div>

              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {showAdvanced ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  高级设置（JSON 编辑）
                </button>

                {showAdvanced && (
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>模板数据 (template_data)</Label>
                      <Textarea
                        value={templateDataJson}
                        onChange={(e) => setTemplateDataJson(e.target.value)}
                        placeholder='{"panels": [...]}'
                        rows={12}
                        className="font-mono text-xs"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        包含 panels 数组，每个 panel 包含 panel_type、camera_angle、shot_size、importance、relative_position
                      </p>
                    </div>
                  </div>
                )}
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
                  {submitting ? "提交中..." : editingTemplate ? "保存" : "创建"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!deletingTemplate}
          onOpenChange={(open) => !open && setDeletingTemplate(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除模板</AlertDialogTitle>
              <AlertDialogDescription>
                {deletingTemplate && (
                  <>
                    确定要删除模板 <strong>&quot;{deletingTemplate.name}&quot;</strong> 吗？
                    <br />
                    该模板已被使用 <strong>{deletingTemplate.usage_count}</strong> 次，
                    点赞 <strong>{deletingTemplate.likes_count}</strong> 次。
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

export default PanelTemplatesAdminPage;
