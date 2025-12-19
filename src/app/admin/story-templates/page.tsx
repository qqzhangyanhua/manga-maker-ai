"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import { BookOpen, Plus, Edit2, Trash2, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";
import { StoryTemplate, STORY_CATEGORIES } from "./types";
import { useStoryTemplateList } from "./hooks/useStoryTemplateList";
import { useStoryTemplateForm } from "./hooks/useStoryTemplateForm";

const StoryTemplatesAdminPage = () => {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { toast } = useToast();
  const isAdmin = (currentUser?.role || "user") === "admin";

  const [deletingTemplate, setDeletingTemplate] = useState<StoryTemplate | null>(null);
  const [structureJson, setStructureJson] = useState("");
  const [promptsJson, setPromptsJson] = useState("");

  const { templates, loading, fetchTemplates, handleTogglePublic, handleDelete } =
    useStoryTemplateList();

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
  } = useStoryTemplateForm(fetchTemplates);

  useEffect(() => {
    if (isAdmin) {
      fetchTemplates();
    }
  }, [isAdmin, fetchTemplates]);

  useEffect(() => {
    if (dialogOpen) {
      setStructureJson(JSON.stringify(form.structure, null, 2));
      setPromptsJson(JSON.stringify(form.prompts, null, 2));
    }
  }, [dialogOpen, form.structure, form.prompts]);

  const handleDeleteClick = (template: StoryTemplate) => {
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
        form.structure = JSON.parse(structureJson);
        form.prompts = JSON.parse(promptsJson);
      } catch (error) {
        toast({ title: "JSON 格式错误，请检查", variant: "destructive" });
        return;
      }
    }
    await baseHandleSubmit();
  };

  const getCategoryName = (category: string) => {
    return STORY_CATEGORIES.find((c) => c.value === category)?.name || category;
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
            <BookOpen className="w-12 h-12 text-primary drop-shadow-md" />
            故事模板管理
          </h1>
          <p className="text-xl text-muted-foreground font-medium pl-2 border-l-4 border-primary/50">
            管理故事生成模板，支持新增、编辑系统模板和用户模板。
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
                    <th className="px-4 py-3 text-left text-sm font-semibold">模板名称</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">分类</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">类型</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">可见性</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">使用次数</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {template.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium">
                          {getCategoryName(template.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {template.user_id === null ? (
                          <span className="inline-block px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100 text-xs font-medium">
                            系统模板
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100 text-xs font-medium">
                            用户模板
                          </span>
                        )}
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
                      <td className="px-4 py-3 text-center">{template.usage_count}</td>
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
                  placeholder="三幕剧结构"
                />
              </div>

              <div>
                <Label>分类*</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      category: value as typeof form.category,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {STORY_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>描述（可选）</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="简短介绍这个模板..."
                  rows={3}
                />
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
                      checked={form.is_system}
                      onChange={(e) => setForm({ ...form, is_system: e.target.checked })}
                    />
                    <span>系统模板（全局可用）</span>
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
                      <Label>结构配置 (structure)</Label>
                      <Textarea
                        value={structureJson}
                        onChange={(e) => setStructureJson(e.target.value)}
                        placeholder='{"acts": [...], "plotPoints": [...]}'
                        rows={8}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div>
                      <Label>提示词配置 (prompts)</Label>
                      <Textarea
                        value={promptsJson}
                        onChange={(e) => setPromptsJson(e.target.value)}
                        placeholder='{"systemPrompt": "...", "examplePremises": [...]}'
                        rows={8}
                        className="font-mono text-xs"
                      />
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
                    该模板已被使用 <strong>{deletingTemplate.usage_count}</strong> 次。
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

export default StoryTemplatesAdminPage;
