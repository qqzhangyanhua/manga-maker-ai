export interface Character {
  id: string;
  name: string;
  base_image_url?: string | null;
  reference_image?: string | null;
  base_prompt?: string | null;
}

export interface Scene {
  id: string;
  name: string;
  image_url?: string | null;
  scene_type?: string | null;
}

export interface AssetLibrarySidebarProps {
  storyId: string;
  projectId: string | null;
  characters: Character[];
  scenes?: Scene[];
  isLoading?: boolean;
  onCharacterSelect?: (character: Character) => void;
  onSceneSelect?: (scene: Scene) => void;
  onClose?: () => void;
}
