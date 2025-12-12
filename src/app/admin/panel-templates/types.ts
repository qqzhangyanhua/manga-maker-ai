export interface PanelTemplate {
  id: string;
  user_id: string | null; // null = official template
  name: string;
  description: string | null;
  panel_count: number;
  template_data: Record<string, unknown>; // JSON structure
  tags: string[];
  is_public: boolean;
  is_official: boolean;
  likes_count: number;
  usage_count: number;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export type PanelTemplateFormData = {
  name: string;
  description: string;
  panel_count: number;
  template_data: Record<string, unknown>;
  tags: string[];
  thumbnail_url: string;
  is_public: boolean;
  is_official: boolean; // 是否为官方模板 (user_id = null)
};

// 默认的 template_data 结构
export const DEFAULT_TEMPLATE_DATA = {
  panels: [
    {
      panel_type: "wide",
      camera_angle: "平视",
      shot_size: "中景",
      importance: 5,
      relative_position: { x: 0, y: 0, width: 1, height: 0.5 },
    },
    {
      panel_type: "medium",
      camera_angle: "平视",
      shot_size: "近景",
      importance: 5,
      relative_position: { x: 0, y: 0.5, width: 0.5, height: 0.5 },
    },
    {
      panel_type: "medium",
      camera_angle: "平视",
      shot_size: "近景",
      importance: 5,
      relative_position: { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
    },
  ],
};

// 常用标签
export const COMMON_TAGS = [
  "漫画",
  "9宫格",
  "经典",
  "动作",
  "对话",
  "悬疑",
  "爱情",
  "分镜",
  "竖版",
  "横版",
];
