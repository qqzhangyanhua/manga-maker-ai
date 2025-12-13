export interface SampleProject {
  id: string;
  title: string;
  premise: string;
  genre: string;
  category: string;
  panelCount: number;
  coverImage: string | null;
  createdAt: Date;
}

export interface SamplesResponse {
  samples: SampleProject[];
}

export interface CopyResponse {
  success: boolean;
  storyId?: string;
  projectId?: string;
  error?: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  beginner: "入门",
  intermediate: "进阶",
  advanced: "高级",
};

export const CATEGORY_COLORS: Record<string, string> = {
  beginner: "bg-green-500/10 text-green-500 border-green-500/30",
  intermediate: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  advanced: "bg-purple-500/10 text-purple-500 border-purple-500/30",
};

export const GENRE_LABELS: Record<string, string> = {
  daily: "日常",
  fantasy: "奇幻",
  scifi: "科幻",
  romance: "爱情",
  adventure: "冒险",
  suspense: "悬疑",
};
