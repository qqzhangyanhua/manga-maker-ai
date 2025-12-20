import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { Character, CharacterFormData, emptyForm } from "../types";

const buildPayload = (form: CharacterFormData, forUpdate: boolean) => {
  const tagList = form.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const baseImageUrl = form.base_image_url.trim();
  const loraModelUrl = form.lora_model_url.trim();
  const loraTriggerWord = form.lora_trigger_word.trim();

  const payload: Record<string, unknown> = {
    user_id: form.user_id.trim(),
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    base_prompt: form.base_prompt.trim() || undefined,
    tags: tagList,
    training_status: form.training_status,
  };

  if (forUpdate) {
    payload.base_image_url = baseImageUrl || null;
    payload.lora_model_url = loraModelUrl || null;
    payload.lora_trigger_word = loraTriggerWord || null;
  } else {
    if (baseImageUrl) payload.base_image_url = baseImageUrl;
    if (loraModelUrl) payload.lora_model_url = loraModelUrl;
    if (loraTriggerWord) payload.lora_trigger_word = loraTriggerWord;
  }

  const progress = Number(form.training_progress);
  if (!Number.isNaN(progress)) {
    payload.training_progress = progress;
  }

  if (!forUpdate && !Array.isArray(payload.tags) || (Array.isArray(payload.tags) && payload.tags.length === 0)) {
    delete payload.tags;
  }
  if (!forUpdate) {
    if (!payload.base_image_url) delete payload.base_image_url;
    if (!payload.lora_model_url) delete payload.lora_model_url;
    if (!payload.lora_trigger_word) delete payload.lora_trigger_word;
  }

  return payload;
};

export const useCharacterForm = (onSuccess: () => void) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Character | null>(null);
  const [form, setForm] = useState<CharacterFormData>({ ...emptyForm });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async ({
      payload,
      characterId,
    }: {
      payload: Record<string, unknown>;
      characterId?: string;
    }) => {
      const url = characterId ? `/api/admin/characters/${characterId}` : "/api/admin/characters";
      const res = await fetch(url, {
        method: characterId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "保存失败");
      }
      return data;
    },
    onSuccess: (_, variables) => {
      toast({ title: variables.characterId ? "更新成功" : "创建成功" });
      queryClient.invalidateQueries({ queryKey: ["admin-list", "/api/admin/characters"] });
      setDialogOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "操作失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditing(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (character: Character) => {
    setEditing(character);
    setForm({
      user_id: character.user_id,
      name: character.name,
      description: character.description || "",
      base_prompt: character.base_prompt || "",
      base_image_url: character.base_image_url || "",
      lora_model_url: character.lora_model_url || "",
      lora_trigger_word: character.lora_trigger_word || "",
      tags: (character.tags || []).join(", "),
      training_status: character.training_status,
      training_progress: character.training_progress ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: "角色名称不能为空", variant: "destructive" });
      return;
    }
    if (!editing && !form.user_id.trim()) {
      toast({ title: "创建时需要指定用户ID", variant: "destructive" });
      return;
    }

    const payload = buildPayload(form, !!editing);
    if (editing && !payload.user_id) {
      delete payload.user_id;
    }

    submitMutation.mutate({
      payload,
      characterId: editing?.id,
    });
  };

  return {
    dialogOpen,
    setDialogOpen,
    editing,
    form,
    setForm,
    submitting: submitMutation.isPending,
    resetForm,
    openCreateDialog,
    openEditDialog,
    handleSubmit,
  };
};
