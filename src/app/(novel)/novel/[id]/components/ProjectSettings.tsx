/**
 * 项目设置组件
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Save, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ProjectSettingsProps {
  project: {
    id: string;
    title: string;
    description: string | null;
    genre: string | null;
    target_words: number | null;
    status: string;
    total_words: number;
    chapter_count: number;
  };
  onUpdate: (project: ProjectSettingsProps["project"]) => void;
}

export function ProjectSettings({ project, onUpdate }: ProjectSettingsProps) {
  const router = useRouter();
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || "");
  const [genre, setGenre] = useState(project.genre || "");
  const [targetWords, setTargetWords] = useState(project.target_words || 100000);
  const [status, setStatus] = useState(project.status);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSave() {
    if (!title.trim()) {
      toast.error("项目标题不能为空");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/novel/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          genre: genre || null,
          target_words: targetWords,
          status,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        onUpdate(updated);
        toast.success("设置保存成功");
      } else {
        const error = await response.json();
        toast.error(error.detail || "保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
      toast.error("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/novel/projects/${project.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("项目已删除");
        router.push("/novel");
      } else {
        const error = await response.json();
        toast.error(error.detail || "删除失败");
      }
    } catch (error) {
      console.error("删除失败:", error);
      toast.error("删除失败，请重试");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">项目标题 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入项目标题"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/200 字符
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">项目描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述你的小说内容、主题或创作意图"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              描述将用于 AI 生成大纲和章节内容
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="genre">类型</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger id="genre">
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">不指定</SelectItem>
                  <SelectItem value="玄幻">玄幻</SelectItem>
                  <SelectItem value="科幻">科幻</SelectItem>
                  <SelectItem value="现代">现代</SelectItem>
                  <SelectItem value="历史">历史</SelectItem>
                  <SelectItem value="悬疑">悬疑</SelectItem>
                  <SelectItem value="言情">言情</SelectItem>
                  <SelectItem value="武侠">武侠</SelectItem>
                  <SelectItem value="奇幻">奇幻</SelectItem>
                  <SelectItem value="都市">都市</SelectItem>
                  <SelectItem value="军事">军事</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-words">目标字数</Label>
              <Input
                id="target-words"
                type="number"
                min={1000}
                max={10000000}
                step={1000}
                value={targetWords}
                onChange={(e) => setTargetWords(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                当前已写 {project.total_words.toLocaleString()} 字
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">项目状态</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="in_progress">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="archived">已归档</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>项目统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">总字数</p>
              <p className="text-2xl font-bold">
                {project.total_words.toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">章节数</p>
              <p className="text-2xl font-bold">{project.chapter_count}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">完成度</p>
              <p className="text-2xl font-bold">
                {targetWords > 0
                  ? Math.min(
                      100,
                      Math.round((project.total_words / targetWords) * 100)
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">危险操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">删除项目</p>
              <p className="text-sm text-muted-foreground">
                删除后将无法恢复，包括所有章节、大纲和设定
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除项目
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确定要删除这个项目吗？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作无法撤销。项目"{project.title}"
                    及其所有数据（{project.chapter_count} 个章节，
                    {project.total_words.toLocaleString()} 字）将被永久删除。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    确认删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "保存中..." : "保存设置"}
        </Button>
      </div>
    </div>
  );
}
