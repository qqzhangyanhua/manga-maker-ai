"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FocusMode } from "../components/FocusMode";
import { ScriptDataProvider, useScriptData } from "../providers/ScriptDataProvider";
import { ScriptOperationsProvider } from "../providers/ScriptOperationsProvider";
import { StoryDetailsSkeleton } from "../components/StoryDetailsSkeleton";

/**
 * 专注模式页面（独立路由）
 *
 * 路由: /projects/[projectId]/focus?panel=[panelId]
 *
 * 优点：
 * 1. URL 状态清晰（可分享链接）
 * 2. 与普通模式完全隔离
 * 3. 可以独立开发和测试
 * 4. 消除了条件渲染分支
 */
function FocusModePageContent({ exitPath }: { exitPath: string }) {
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
    router.push(exitPath);
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

export function FocusModePage({ storyId, routeProjectId }: { storyId: string; routeProjectId: string }) {
  return (
    <ScriptDataProvider storyId={storyId}>
      <ScriptOperationsProvider>
        <FocusModePageContent exitPath={`/projects/${routeProjectId}`} />
      </ScriptOperationsProvider>
    </ScriptDataProvider>
  );
}
