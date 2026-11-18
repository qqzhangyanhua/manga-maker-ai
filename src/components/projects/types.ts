export type Panel = {
  id: string;
  generated_image?: string | null;
  created_at?: string;
};

export type Project = {
  id: string;
  title: string;
  description?: string | null;
  style?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  panels: Panel[];
  cover_image?: string | null;
  premise?: string | null;
  /** 有值表示故事主项目（打开剧本编辑器），否则是独立分镜项目 */
  story_id?: string | null;
};
