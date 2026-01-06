"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FocusMode } from "../components/FocusMode";
import { ScriptDataProvider, useScriptData } from "../providers/ScriptDataProvider";
import { ScriptOperationsProvider } from "../providers/ScriptOperationsProvider";
import { StoryDetailsSkeleton } from "../components/StoryDetailsSkeleton";

/**
 * 专注模式页面（独立路由）
 *
 * 路由: /scripts/[id]/focus?panel=[panelId]
 *
 * 优点：
 * 1. URL 状态清晰（可分享链接）
 * 2. 与普通模式完全隔离
 * 3. 可以独立开发和测试
 * 4. 消除了条件渲染分支
 */
function FocusModePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPanelId = searchParams.get("panel");

  const {
    storyId,
    projectId,
    panels,
    chapters,
    characterAssets,
    isLoading,
    refetchAll,
  } = useScriptData();

  // 退出专注模式
  const handleExit = () => {
    router.push(`/scripts/${storyId}`);
  };

  if (isLoading) {
    return <StoryDetailsSkeleton />;
  }

  return (
    <FocusMode
      storyId={storyId}
      projectId={projectId}
      panels={panels}
      chapters={chapters}
      characters={characterAssets}
      initialPanelId={initialPanelId}
      onExit={handleExit}
      onPanelUpdate={refetchAll}
    />
  );
}

export default function FocusModePage() {
  const params = useParams();
  const storyId = params.id as string;

  return (
    <ScriptDataProvider storyId={storyId}>
      <ScriptOperationsProvider>
        <FocusModePageContent />
      </ScriptOperationsProvider>
    </ScriptDataProvider>
  );
}
