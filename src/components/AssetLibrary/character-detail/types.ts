import type { ComicStyle } from "../CharacterLibrary";

export interface CharacterAsset {
  id: string;
  name: string;
  description: string | null;
  base_image_url: string | null;
  tags: string[];
  training_status: "pending" | "training" | "ready" | "failed";
  usage_count: number;
  comic_style?: ComicStyle | null;
  views?: Array<{ id: string; view_type: string; image_url: string }>;
  expressions?: Array<{ id: string; expression_type: string; image_url: string }>;
  outfits?: Array<{ id: string; outfit_name: string; outfit_type: string; image_url: string | null }>;
}

export interface CharacterDetailProps {
  character: CharacterAsset;
  onBack: () => void;
  onUpdate?: (character: CharacterAsset) => void;
}

export interface ExpressionItem {
  id: string;
  label: string;
  emoji: string;
}

export interface OutfitPreset {
  id: string;
  label: string;
  icon: string;
}

export interface ViewGeneratingState {
  front?: boolean;
  side?: boolean;
  back?: boolean;
}

export interface GeneratedViewsState {
  front?: string;
  side?: string;
  back?: string;
}

export interface CreateOutfitData {
  outfit_name: string;
  outfit_type: string;
  description?: string;
}

export type ViewType = "front" | "side" | "back";
export type UploadType = ViewType | string; // string for expression IDs or outfit IDs

export { ComicStyle };
