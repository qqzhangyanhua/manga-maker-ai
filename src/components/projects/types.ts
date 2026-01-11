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
};
