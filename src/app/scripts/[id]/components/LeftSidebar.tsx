import { StoryInfoPanel } from "./StoryInfoPanel";
import { ChapterList } from "./ChapterList";
import { StoryCharacterList } from "@/components/StoryCharacter/StoryCharacterList";
import type { Story, StoryFormData } from "../types/script-editor.types";
import type { CharacterRole, StoryCharacterWithDetails } from "@/components/StoryCharacter/types";

type LeftSidebarProps = {
  // Story Info
  story: Story;
  editMode: boolean;
  storyForm: StoryFormData;
  saving: boolean;
  onEditModeToggle: () => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  onAutoSave: (formData: StoryFormData) => Promise<void>;
  onFormChange: (field: string, value: string | null) => void;

  // Chapter List
  storyId: string;
  currentChapterId: string | null;
  onChapterSelect: (chapterId: string | null) => void;

  // Story Characters
  storyCharacters: StoryCharacterWithDetails[];
  onAddCharacter: (characterId: string, role: CharacterRole) => Promise<void>;
  onRemoveCharacter: (characterId: string) => Promise<void>;
  onCharacterRoleChange: (characterId: string, role: CharacterRole) => Promise<void>;
  isStoryCharactersLoading: boolean;
  onRefreshStoryCharacters: () => void;
};

/**
 * 左侧边栏组件
 * 包含故事信息、章节列表和角色列表
 */
export function LeftSidebar({
  story,
  editMode,
  storyForm,
  saving,
  onEditModeToggle,
  onCancel,
  onSave,
  onAutoSave,
  onFormChange,
  storyId,
  currentChapterId,
  onChapterSelect,
  storyCharacters,
  onAddCharacter,
  onRemoveCharacter,
  onCharacterRoleChange,
  isStoryCharactersLoading,
  onRefreshStoryCharacters,
}: LeftSidebarProps) {
  return (
    <div className="lg:col-span-1 space-y-6">
      <StoryInfoPanel
        story={story}
        editMode={editMode}
        storyForm={storyForm}
        saving={saving}
        onEditModeToggle={onEditModeToggle}
        onCancel={onCancel}
        onSave={onSave}
        onAutoSave={onAutoSave}
        onFormChange={onFormChange}
      />

      <ChapterList
        storyId={storyId}
        currentChapterId={currentChapterId}
        onChapterSelect={onChapterSelect}
      />

      <StoryCharacterList
        storyId={storyId}
        characters={storyCharacters}
        onAdd={onAddCharacter}
        onRemove={onRemoveCharacter}
        onRoleChange={onCharacterRoleChange}
        isLoading={isStoryCharactersLoading}
        onRefresh={onRefreshStoryCharacters}
      />
    </div>
  );
}
