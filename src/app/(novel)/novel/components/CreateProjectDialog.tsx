/**
 * 创建项目对话框
 */
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const formSchema = z.object({
  title: z.string().min(1, "请输入项目标题").max(200, "标题不能超过200字"),
  description: z.string().optional(),
  genre: z.string().optional(),
  target_words: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateProjectDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      genre: "",
      target_words: 50000,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      setLoading(true);

      const response = await fetch("/api/novel/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "创建失败");
      }

      toast.success("项目创建成功");
      form.reset();
      onSuccess();
    } catch (error) {
      console.error("创建项目失败:", error);
      toast.error(error instanceof Error ? error.message : "创建失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>新建小说项目</DialogTitle>
          <DialogDescription>
            填写项目基本信息，开始你的创作之旅
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>项目标题 *</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：穿越异世界的冒险" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>项目简介</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="简要描述你的故事..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    可选，帮助你记住这个项目的核心内容
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>类型</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="suspense">悬疑</SelectItem>
                        <SelectItem value="romance">言情</SelectItem>
                        <SelectItem value="adventure">冒险</SelectItem>
                        <SelectItem value="scifi">科幻</SelectItem>
                        <SelectItem value="fantasy">奇幻</SelectItem>
                        <SelectItem value="other">其他</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_words"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>目标字数</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50000"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>可选</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                取消
              </Button>
              <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
                {loading ? "创建中..." : "创建项目"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
