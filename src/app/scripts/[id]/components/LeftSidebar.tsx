"use client";

import { StoryInfoPanel } from "./StoryInfoPanel";
import { ChapterList } from "./ChapterList";
import { StoryCharacterList } from "@/components/StoryCharacter/StoryCharacterList";
import {
  useScriptEditorData,
  useScriptEditorUI,
  useScriptEditorOperations,
} from "../contexts/ScriptEditorContext";
import { useUpdateStory } from "../hooks/useStoryData";

/**
 * 左侧边栏组件
 * 包含故事信息、章节列表和角色列表
 * 通过 Context 获取所有数据和操作
 */
export function LeftSidebar() {
  const {
    storyId,
    story,
    storyCharacters,
    isStoryCharactersLoading,
    refetchStoryCharacters,
  } = useScriptEditorData();

  const { state, actions } = useScriptEditorUI();

  const {
    updateStory,
    isSaving,
    addCharacter,
    removeCharacter,
    updateCharacterRole,
  } = useScriptEditorOperations();

  // 需要单独获取 mutateAsync 用于 autoSave
  const updateStoryMutation = useUpdateStory(storyId);

  if (!story) {
    return null;
  }

  return (
    <div className="lg:col-span-1 space-y-6">
      <StoryInfoPanel
        story={story}
        editMode={state.editMode}
        storyForm={state.storyForm}
        saving={isSaving}
        onEditModeToggle={() => actions.setEditMode(true)}
        onCancel={() => actions.setEditMode(false)}
        onSave={updateStory}
        onAutoSave={async (formData) => {
          await updateStoryMutation.mutateAsync(formData);
        }}
        onFormChange={(field, value) => actions.updateStoryForm({ [field]: value })}
      />

      <ChapterList
        storyId={storyId}
        currentChapterId={state.currentChapterId}
        onChapterSelect={actions.setCurrentChapter}
      />

      <StoryCharacterList
        storyId={storyId}
        characters={storyCharacters}
        onAdd={addCharacter}
        onRemove={removeCharacter}
        onRoleChange={updateCharacterRole}
        isLoading={isStoryCharactersLoading}
        onRefresh={refetchStoryCharacters}
      />
    </div>
  );
}
