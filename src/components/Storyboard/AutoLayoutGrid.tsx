import { PanelData } from "./StoryboardPanel";
import StoryboardPanel from "./StoryboardPanel";
import { cn } from "@/lib/utils";

interface AutoLayoutGridProps {
  panels: PanelData[];
  selectedPanel: string | null;
  onPanelSelect: (id: string) => void;
}

// Dynamic layout based on panel importance and type
const getLayoutClass = (panels: PanelData[], index: number): string => {
  const panel = panels[index];
  const prevPanel = index > 0 ? panels[index - 1] : null;
  const nextPanel = index < panels.length - 1 ? panels[index + 1] : null;

  // High importance panels get more space
  if (panel.importance === "high") {
    if (panel.type === "wide" || panel.type === "action") {
      return "col-span-2 row-span-2"; // Large square
    }
    return "col-span-2"; // Wide rectangle
  }

  // Action panels are often wide
  if (panel.type === "action") {
    return "col-span-2";
  }

  // Closeups can be tall
  if (panel.type === "closeup" && panel.importance === "medium") {
    return "row-span-2";
  }

  // Dialogue panels are usually standard
  if (panel.type === "dialogue") {
    return "col-span-1";
  }

  // Transition panels are small
  if (panel.type === "transition") {
    return "col-span-1";
  }

  // Default
  return "col-span-1";
};

const AutoLayoutGrid = ({ panels, selectedPanel, onPanelSelect }: AutoLayoutGridProps) => {
  if (panels.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-muted-foreground">
        分镜将在这里显示...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 auto-rows-[minmax(150px,auto)] gap-3">
      {panels.map((panel, index) => (
        <div
          key={panel.id}
          className={cn(
            "transition-all duration-300",
            getLayoutClass(panels, index)
          )}
        >
          <StoryboardPanel
            panel={panel}
            index={index}
            isSelected={selectedPanel === panel.id}
            onClick={() => onPanelSelect(panel.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default AutoLayoutGrid;
