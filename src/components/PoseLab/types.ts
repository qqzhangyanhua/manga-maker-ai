import { PoseData } from "./Mannequin";

/**
 * Character type definition
 */
export type Character = {
  id: string;
  name: string;
  description: string | null;
  base_image_url: string | null;
};

/**
 * Generated image data for preview
 */
export type GeneratedImage = {
  url: string;
  poseName: string;
  poseDescription: string;
};

/**
 * Props for PoseLabEditor component
 */
export interface PoseLabEditorProps {
  onGenerateWithPose?: (pose: PoseData) => void;
}

/**
 * Preset pose definition
 */
export type PresetPose = {
  name: string;
  pose: PoseData;
};
