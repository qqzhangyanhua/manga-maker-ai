"use client";

/**
 * 专注模式主入口组件
 * Focus Mode Main Entry Component
 */

import type { Panel } from "@prisma/client";
import type { Chapter } from "@prisma/client";
import type { Character } from "@prisma/client";
import { FocusModeProvider } from "../../contexts/FocusModeContext";
import { FocusModeLayout } from "./FocusModeLayout";

interface FocusModeProps {
  storyId: string;
  projectId: string | null;
  panels: Panel[];
  chapters: Chapter[];
  characters: Character[];
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
      panels={panels}
      chapters={chapters}
      characters={characters}
      initialPanelId={initialPanelId}
      onExit={onExit}
    >
      <FocusModeLayout storyId={storyId} projectId={projectId} onPanelUpdate={onPanelUpdate} />
    </FocusModeProvider>
  );
}

// 导出类型
export type { FocusModeProps };

