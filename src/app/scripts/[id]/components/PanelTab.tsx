import { Loader2 } from "lucide-react";
import { PanelListView } from "./PanelListView";
import type { Panel } from "../types/script-editor.types";
import type { CharacterReference } from "../types/character.types";

type PanelTabProps = {
  // Data
  panels: Panel[];
  projectId: string | null;
  storyId: string;
  currentChapterId: string | null;

  // Characters
  characters: CharacterReference[];
  charactersLoading: boolean;
  onCharactersRefresh: () => void;

  // Panel Operations
  onGeneratePanelsForChapter: (chapterId: string) => Promise<void>;
  isGeneratingPanels: boolean;
  streamingPanels: Panel[];
  onDeletePanel: (panelId: string) => Promise<void>;
  onImageGenerated: (panelId: string, imageUrl: string) => Promise<void>;
  onRefresh: () => void;
  onError: (message: string) => void;

  // Loading State
  isPanelsLoading: boolean;
};

/**
 * 分镜列表Tab组件
 * 封装分镜列表的加载状态和PanelListView
 */
export function PanelTab({
  panels,
  projectId,
  storyId,
  currentChapterId,
  characters,
  charactersLoading,
  onCharactersRefresh,
  onGeneratePanelsForChapter,
  isGeneratingPanels,
  streamingPanels,
  onDeletePanel,
  onImageGenerated,
  onRefresh,
  onError,
  isPanelsLoading,
}: PanelTabProps) {
  if (isPanelsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm text-muted-foreground">加载分镜列表中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PanelListView
      panels={panels}
      projectId={projectId}
      storyId={storyId}
      currentChapterId={currentChapterId}
      onGeneratePanelsForChapter={onGeneratePanelsForChapter}
      isGeneratingPanels={isGeneratingPanels}
      streamingPanels={streamingPanels}
      characters={characters}
      charactersLoading={charactersLoading}
      onCharactersRefresh={onCharactersRefresh}
      onPanelsChange={() => {}}
      onDeletePanel={onDeletePanel}
      onImageGenerated={onImageGenerated}
      onRefresh={onRefresh}
      onError={onError}
    />
  );
}
