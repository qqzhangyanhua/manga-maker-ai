import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Lock } from "lucide-react";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { TAB_VALUES } from "../hooks/useUIState";
import { SerialChapterList } from "@/components/SerialChapterList";
import type { Panel as SerialPanel } from "@/components/SerialChapterList/types";
import { StoryCharactersManager } from "./StoryCharactersManager";
import { StoryImagesGallery } from "./StoryImagesGallery";
import { LayoutExportTab } from "./LayoutExportTab";
import { BatchOperationsManager } from "./BatchOperationsManager";
import type { ScriptPageTabsProps } from "../types/component-props.types";

export function ScriptPageTabs({
  activeTab,
  storyId,
  projectId,
  sourceNovelId,
  storyTitle,
  storyStyle,
  chapters,
  panels,
  storyCharacters,
  characterAssets,
  isCharactersLoading,
  isGenerating,
  streamingPanels,
  progressStats,
  nextChapterOrder,
  onTabChange,
  onCreateChapter,
  onGenerateNext,
  onGeneratePanels,
  onGenerateBackground,
  onDeletePanel,
  onImageGenerated,
  onCharactersRefresh,
  onStoryCharactersRefresh,
  onRefreshStoryData,
  onRefetchPanels,
  onError,
}: ScriptPageTabsProps) {
  const serialPanels = panels as unknown as SerialPanel[];
  const batchPanels = serialPanels as unknown as Array<{
    id: string;
    prompt_used?: string;
    [key: string]: unknown;
  }>;

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="mb-6 bg-transparent border-b border-gray-800 rounded-none w-full justify-start h-auto p-0">
        <TabsTrigger
          value={TAB_VALUES.SERIAL}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent bg-transparent px-4 py-3 text-gray-400 data-[state=active]:text-white data-[state=active]:shadow-none"
        >
          <div className="flex items-center gap-2">
            <span>章节创作</span>
            {progressStats.totalChapters > 0 && (
              <Badge variant="secondary" className="ml-1">
                {progressStats.completedChapters}/{progressStats.totalChapters}
              </Badge>
            )}
          </div>
        </TabsTrigger>
        <TabsTrigger
          value={TAB_VALUES.CHARACTERS}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent bg-transparent px-4 py-3 text-gray-400 data-[state=active]:text-white data-[state=active]:shadow-none"
        >
          <div className="flex items-center gap-2">
            <span>关联角色</span>
            {storyCharacters.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {storyCharacters.length}
              </Badge>
            )}
          </div>
        </TabsTrigger>
        <TabsTrigger
          value={TAB_VALUES.GALLERY}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent bg-transparent px-4 py-3 text-gray-400 data-[state=active]:text-white data-[state=active]:shadow-none"
          style={{ display: FEATURE_FLAGS.NEW_ASSET_SIDEBAR ? 'none' : 'flex' }}
        >
          素材库
        </TabsTrigger>
        <TabsTrigger
          value={TAB_VALUES.LAYOUT}
          disabled={progressStats.totalPanels === 0}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent bg-transparent px-4 py-3 text-gray-400 data-[state=active]:text-white data-[state=active]:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            <span>排版导出</span>
            {progressStats.totalPanels === 0 && <Lock className="w-3 h-3" />}
          </div>
        </TabsTrigger>
      </TabsList>

      {/* 章节创作视图 */}
      <TabsContent value={TAB_VALUES.SERIAL} className="mt-0">
        <BatchOperationsManager panels={batchPanels} onRefresh={onRefetchPanels} />
        <SerialChapterList
          storyId={storyId}
          projectId={projectId}
          chapters={chapters}
          panels={serialPanels}
          characters={characterAssets}
          charactersLoading={isCharactersLoading}
          isGeneratingPanels={isGenerating}
          streamingPanels={streamingPanels}
          storyStyle={storyStyle}
          onRefresh={onRefreshStoryData}
          onCreateChapter={onCreateChapter}
          onGenerateNext={onGenerateNext}
          onGeneratePanels={onGeneratePanels}
          onGenerateBackground={onGenerateBackground}
          onDeletePanel={onDeletePanel}
          onImageGenerated={onImageGenerated}
          onCharactersRefresh={onCharactersRefresh}
          onError={onError}
        />
      </TabsContent>

      {/* 关联角色视图 */}
      <TabsContent value={TAB_VALUES.CHARACTERS} className="mt-0">
        <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
          <StoryCharactersManager
            storyId={storyId}
            sourceNovelId={sourceNovelId}
            storyCharacters={storyCharacters}
            onCharacterSelect={() => {
              // 角色选择逻辑已在 StoryCharactersManager 内部处理
            }}
            onRefresh={onStoryCharactersRefresh}
          />
        </div>
      </TabsContent>

      {/* 素材库视图 */}
      <TabsContent value={TAB_VALUES.GALLERY} className="mt-0">
        <div className="bg-[#1a1a1f]/60 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
          <StoryImagesGallery storyId={storyId} projectId={projectId} />
        </div>
      </TabsContent>

      {/* 排版导出视图 */}
      <TabsContent value={TAB_VALUES.LAYOUT} className="mt-0">
        <LayoutExportTab
          storyId={storyId}
          projectId={projectId}
          chapters={chapters}
          panels={panels}
          storyTitle={storyTitle}
        />
      </TabsContent>
    </Tabs>
  );
}
