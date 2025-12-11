export interface CharacterReferenceView {
  id: string;
  view_type: string;
  image_url: string | null;
}

export interface CharacterReferenceExpression {
  id: string;
  expression_type: string;
  image_url: string | null;
}

export interface CharacterReferenceOutfit {
  id: string;
  outfit_name: string;
  outfit_type: string;
  image_url: string | null;
  is_default?: boolean;
}

export type CharacterTrainingStatus = "pending" | "training" | "ready" | "failed";

export interface CharacterReference {
  id: string;
  name: string;
  description?: string | null;
  base_image_url?: string | null;
  base_prompt?: string | null;
  tags?: string[];
  training_status?: CharacterTrainingStatus;
  views?: CharacterReferenceView[];
  expressions?: CharacterReferenceExpression[];
  outfits?: CharacterReferenceOutfit[];
}
