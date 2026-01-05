"use client";

/**
 * 专注模式主入口组件
 * Focus Mode Main Entry Component
 */

import type { Panel, Chapter, CharacterAsset } from "@/types";
import { FocusModeProvider } from "../../contexts/FocusModeContext";
import { FocusModeLayout } from "./FocusModeLayout";

interface FocusModeProps {
  storyId: string;
  projectId: string | null;
  panels: Panel[];
  chapters: Chapter[];
  characters: CharacterAsset[];
  initialPanelId?: string | null;
  onExit: () => void;
  onPanelUpdate: () => void;
}

/**
 * 专注模式容器组件
 * 负责提供上下文和渲染布局
 */
export function FocusMode({
  storyId,
  projectId,
  panels,
  chapters,
  characters,
  initialPanelId,
  onExit,
  onPanelUpdate,
}: FocusModeProps) {
  return (
    <FocusModeProvider
      storyId={storyId}
      projectId={projectId}
      panels={panels}
      chapters={chapters}
      characters={characters}
      initialPanelId={initialPanelId}
      onExit={onExit}
      onPanelUpdate={onPanelUpdate}
    >
      <FocusModeLayout storyId={storyId} projectId={projectId} />
    </FocusModeProvider>
  );
}

// 导出类型
export type { FocusModeProps };

