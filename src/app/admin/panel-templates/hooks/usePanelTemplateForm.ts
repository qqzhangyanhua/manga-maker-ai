import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { PanelTemplate, PanelTemplateFormData, DEFAULT_TEMPLATE_DATA } from "../types";

const getEmptyForm = (): PanelTemplateFormData => ({
  name: "",
  description: "",
  panel_count: 3,
  template_data: DEFAULT_TEMPLATE_DATA,
  tags: [],
  thumbnail_url: "",
  is_public: false,
  is_official: false,
});

export const usePanelTemplateForm = (onSuccess: () => void) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PanelTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<PanelTemplateFormData>(getEmptyForm());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { toast } = useToast();

  const handleOpenDialog = (template?: PanelTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setForm({
        name: template.name,
        description: template.description || "",
        panel_count: template.panel_count,
        template_data: template.template_data,
        tags: template.tags,
        thumbnail_url: template.thumbnail_url || "",
        is_public: template.is_public,
        is_official: template.is_official,
      });
    } else {
      setEditingTemplate(null);
      setForm(getEmptyForm());
    }
    setShowAdvanced(false);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || form.panel_count < 1) {
      toast({ title: "请填写所有必填项", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const url = editingTemplate
        ? `/api/admin/panel-templates/${editingTemplate.id}`
        : "/api/admin/panel-templates";

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
