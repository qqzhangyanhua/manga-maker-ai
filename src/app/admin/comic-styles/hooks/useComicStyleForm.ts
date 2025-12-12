import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ComicStyle, ComicStyleFormData } from "../types";

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
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ComicStyleFormData>(getEmptyForm(stylesLength));
  const { toast } = useToast();

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
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "操作失败";
      toast({ title: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    dialogOpen,
    setDialogOpen,
    editingStyle,
    form,
    setForm,
    submitting,
    handleOpenDialog,
    handleSubmit,
  };
};
