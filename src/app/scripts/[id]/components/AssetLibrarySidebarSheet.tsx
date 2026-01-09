import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AssetLibrarySidebar } from "@/components/AssetLibrarySidebar";

interface AssetLibrarySidebarSheetProps {
  open: boolean;
  storyId: string;
  projectId: string | null;
  characterAssets: unknown[];
  isCharactersLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onCharacterSelect: (character: { id: string; name: string }) => Promise<void>;
  onSceneSelect: (scene: { id: string; name: string }) => Promise<void>;
}

export function AssetLibrarySidebarSheet({
  open,
  storyId,
  projectId,
  characterAssets,
  isCharactersLoading,
  onOpenChange,
  onCharacterSelect,
  onSceneSelect,
}: AssetLibrarySidebarSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
        <SheetHeader className="px-6 py-4 border-b border-gray-800">
          <SheetTitle>素材库</SheetTitle>
        </SheetHeader>
        <div className="p-4 bg-blue-500/10 border-b border-blue-500/20">
          <p className="text-sm text-blue-400">
            💡 提示：先选择分镜，然后选择角色或场景，即可批量应用
          </p>
        </div>
        <AssetLibrarySidebar
          storyId={storyId}
          projectId={projectId}
          characters={characterAssets as never}
          scenes={[]}
          isLoading={isCharactersLoading}
          onCharacterSelect={onCharacterSelect}
          onSceneSelect={onSceneSelect}
        />
      </SheetContent>
    </Sheet>
  );
}
