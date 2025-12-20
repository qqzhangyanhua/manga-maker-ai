import { useState, useRef, ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ComicStyle, ComicStyleFormData } from "../types";

const COMIC_STYLES_QUERY_KEY = ["admin-comic-styles"];

const getEmptyForm = (stylesLength: number): ComicStyleFormData => ({
  style_key: "",
  name_zh: "",
  name_en: "",
  image_url: "",
  tag_color: "bg-primary text-background",
  description: "",
  prompt_prefix: "",
  sort_order: stylesLength,
  enabled: true,
});

export const useComicStyleForm = (stylesLength: number, onSuccess: () => void) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<ComicStyle | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<ComicStyleFormData>(getEmptyForm(stylesLength));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async ({
      formData,
      styleId,
    }: {
      formData: ComicStyleFormData;
      styleId?: string;
    }) => {
      const url = styleId
        ? `/api/admin/comic-styles/${styleId}`
        : "/api/admin/comic-styles";

      const res = await fetch(url, {
        method: styleId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "操作失败" }));
        throw new Error(error.error || "操作失败");
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({ title: variables.styleId ? "更新成功" : "创建成功" });
      queryClient.invalidateQueries({ queryKey: COMIC_STYLES_QUERY_KEY });
      setDialogOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

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
      setForm(getEmptyForm(stylesLength));
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.style_key || !form.name_zh || !form.name_en || !form.image_url) {
      toast({ title: "请填写所有必填项", variant: "destructive" });
      return;
    }

    submitMutation.mutate({
      formData: form,
      styleId: editingStyle?.id,
    });
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "仅支持 JPG、PNG、WebP 格式", variant: "destructive" });
      return;
    }

    // 验证文件大小 (4MB)
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "文件大小不能超过 4MB", variant: "destructive" });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "comic-styles");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "上传失败");
      }

      const data = await res.json();
      setForm((prev) => ({ ...prev, image_url: data.url }));
      toast({ title: "图片上传成功" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "上传失败";
      toast({ title: message, variant: "destructive" });
    } finally {
      setUploading(false);
      // 重置 input 以允许重复上传同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return {
    dialogOpen,
    setDialogOpen,
    editingStyle,
    form,
    setForm,
    submitting: submitMutation.isPending,
    uploading,
    fileInputRef,
    handleOpenDialog,
    handleSubmit,
    handleFileSelect,
    triggerFileInput,
  };
};
