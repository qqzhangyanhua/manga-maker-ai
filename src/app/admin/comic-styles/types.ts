export interface ComicStyle {
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

export type ComicStyleFormData = {
  style_key: string;
  name_zh: string;
  name_en: string;
  image_url: string;
  tag_color: string;
  description: string;
  prompt_prefix: string;
  sort_order: number;
  enabled: boolean;
};

export const PRESET_COLORS = [
  { name: "粉色", value: "bg-comic-pink text-background" },
  { name: "红色", value: "bg-comic-red text-foreground" },
  { name: "蓝色", value: "bg-comic-blue text-background" },
  { name: "紫色", value: "bg-comic-purple text-foreground" },
  { name: "绿色", value: "bg-comic-green text-background" },
  { name: "橙色", value: "bg-comic-orange text-background" },
  { name: "主题色", value: "bg-primary text-background" },
];
