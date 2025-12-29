import { cn } from "@/lib/utils";
import { PresetPose } from "./types";

interface PresetPosePanelProps {
  presetPoses: PresetPose[];
  selectedPreset: string;
  onPresetSelect: (preset: PresetPose) => void;
}

/**
 * Panel displaying a grid of preset poses for selection
 */
export function PresetPosePanel({
  presetPoses,
  selectedPreset,
  onPresetSelect,
}: PresetPosePanelProps) {
  return (
    <div className="comic-card p-4">
      <h3 className="font-comic text-lg text-foreground mb-3">预设姿势</h3>
      <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1">
        {presetPoses.map((preset) => (
          <button
            key={preset.name}
            onClick={() => onPresetSelect(preset)}
            className={cn(
              "px-2 py-2 rounded-lg text-xs font-semibold transition-all",
              "border-2",
              selectedPreset === preset.name
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-border hover:border-primary/50"
            )}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
}
