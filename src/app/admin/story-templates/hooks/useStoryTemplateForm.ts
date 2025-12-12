import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { StoryTemplate, StoryTemplateFormData, DEFAULT_STRUCTURE, DEFAULT_PROMPTS } from "../types";

const getEmptyForm = (): StoryTemplateFormData => ({
  name: "",
  category: "suspense",
  description: "",
  structure: DEFAULT_STRUCTURE,
  prompts: DEFAULT_PROMPTS,
  is_public: true,
  is_system: false,
});

export const useStoryTemplateForm = (onSuccess: () => void) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<StoryTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<StoryTemplateFormData>(getEmptyForm());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { toast } = useToast();

  const handleOpenDialog = (template?: StoryTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setForm({
        name: template.name,
        category: template.category,
        description: template.description || "",
        structure: template.structure,
        prompts: template.prompts,
        is_public: template.is_public,
        is_system: template.user_id === null,
      });
    } else {
      setEditingTemplate(null);
      setForm(getEmptyForm());
    }
    setShowAdvanced(false);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.category) {
      toast({ title: "请填写所有必填项", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const url = editingTemplate
        ? `/api/admin/story-templates/${editingTemplate.id}`
        : "/api/admin/story-templates";

      const res = await fetch(url, {
        method: editingTemplate ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "操作失败");
      }

      toast({ title: editingTemplate ? "更新成功" : "创建成功" });
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
    editingTemplate,
    form,
    setForm,
    submitting,
    showAdvanced,
    setShowAdvanced,
    handleOpenDialog,
    handleSubmit,
  };
};
