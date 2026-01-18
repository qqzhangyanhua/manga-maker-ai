/**
 * CharacterPreparationDrawer - 角色准备管理抽屉
 */

import { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfoIcon, XIcon } from "lucide-react";
import { CharacterStatusCard } from "./CharacterStatusCard";
import { NovelCharacterCard } from "./NovelCharacterCard";
import { UpgradeNovelCharacterDialog } from "./UpgradeNovelCharacterDialog";
import {
  useChapterCharacters,
  useNovelCharacters,
  useUpgradeCharacter,
  useRegenerateCharacterImage,
} from "@/hooks/useCharacterPreparation";

interface NovelCharacter {
  name: string;
  role: string;
  description: string;
  tempId: string;
  traits?: string[];
  relationships?: Record<string, string>;
}

interface CharacterPreparationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string | null;
  timelineId: string | null;
}

const HINT_KEY_PREFIX = "character-preparation-hint-dismissed-";

export function CharacterPreparationDrawer({
  isOpen,
  onClose,
  chapterId,
  timelineId,
}: CharacterPreparationDrawerProps) {
  const [showHint, setShowHint] = useState(false);
  const [selectedNovelCharacter, setSelectedNovelCharacter] = useState<NovelCharacter | null>(null);
  const [upgradingCharacterId, setUpgradingCharacterId] = useState<string | null>(null);

  // 数据获取
  const chapterCharactersQuery = useChapterCharacters(chapterId);
  const novelCharactersQuery = useNovelCharacters(timelineId);

  // 操作
  const upgradeMutation = useUpgradeCharacter(chapterId || "");
  const regenerateMutation = useRegenerateCharacterImage(chapterId || "");

  const chapterCharacters = useMemo(() => chapterCharactersQuery.data || [], [chapterCharactersQuery.data]);
  const novelCharacters = useMemo(() => novelCharactersQuery.data || [], [novelCharactersQuery.data]);

  // 计算统计信息
  const missingImageCount = useMemo(() => {
    return chapterCharacters.filter((c) => !c.base_image_url).length;
  }, [chapterCharacters]);

  // 智能检测提示
  useEffect(() => {
    if (!isOpen || !chapterId) return;

    const hasNovelCharacters = novelCharacters.length > 0;
    const hasMissingImages = missingImageCount > 0;

    if (hasNovelCharacters || hasMissingImages) {
      const key = `${HINT_KEY_PREFIX}${chapterId}`;
      const dismissed = localStorage.getItem(key);

      if (!dismissed) {
        setShowHint(true);
      }
    }
  }, [isOpen, chapterId, novelCharacters.length, missingImageCount]);

  const dismissHint = () => {
    if (chapterId) {
      const key = `${HINT_KEY_PREFIX}${chapterId}`;
      localStorage.setItem(key, new Date().toISOString());
      setShowHint(false);
    }
  };

  // 升级角色
  const handleUpgradeCharacter = (character: NovelCharacter) => {
    setSelectedNovelCharacter(character);
  };

  const handleConfirmUpgrade = (character: NovelCharacter, generateImage: boolean) => {
    setUpgradingCharacterId(character.tempId);
    upgradeMutation.mutate(
      {
        novelCharacter: character,
        generateImage,
      },
      {
        onSettled: () => {
          setUpgradingCharacterId(null);
          setSelectedNovelCharacter(null);
        },
      }
    );
  };

  // 重新生成图片
  const handleRegenerateImage = (characterId: string) => {
    regenerateMutation.mutate(characterId);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-[600px] sm:max-w-[600px] p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>角色准备</SheetTitle>
            <SheetDescription>
              管理章节角色资产，升级小说角色为可复用的角色实体
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="px-6 py-4 space-y-6">
              {/* 智能提示 */}
              {showHint && (
                <Alert variant="default" className="border-blue-200 bg-blue-50">
                  <InfoIcon className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-900">检测到未完成的角色准备</AlertTitle>
                  <AlertDescription className="text-blue-800">
                    发现 {novelCharacters.length} 个小说角色待升级
                    {missingImageCount > 0 && `，${missingImageCount} 个角色缺少基础图片`}
                  </AlertDescription>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={dismissHint}
                    className="mt-2 h-7 text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                  >
                    <XIcon className="h-3 w-3 mr-1" />
                    知道了，不再提示
                  </Button>
                </Alert>
              )}

              {/* 章节角色区域 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">
                    章节角色 ({chapterCharacters.length})
                  </h3>
                  {missingImageCount > 0 && (
                    <span className="text-xs text-amber-600">
                      {missingImageCount} 个缺失图片
                    </span>
                  )}
                </div>

                {chapterCharactersQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    加载中...
                  </div>
                ) : chapterCharacters.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg bg-muted/30">
                    当前章节暂无角色
                  </div>
                ) : (
                  <div className="space-y-2">
                    {chapterCharacters.map((character) => (
                      <CharacterStatusCard
                        key={character.id}
                        character={character}
                        onRegenerate={handleRegenerateImage}
                        isRegenerating={regenerateMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* 小说角色区域 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">
                    待升级的小说角色 ({novelCharacters.length})
                  </h3>
                </div>

                {novelCharactersQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    加载中...
                  </div>
                ) : novelCharacters.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg bg-muted/30">
                    所有小说角色已升级
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {novelCharacters.map((character) => (
                      <NovelCharacterCard
                        key={character.tempId}
                        novelCharacter={character}
                        onUpgrade={handleUpgradeCharacter}
                        isUpgrading={upgradingCharacterId === character.tempId}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* 升级确认对话框 */}
      <UpgradeNovelCharacterDialog
        isOpen={!!selectedNovelCharacter}
        onClose={() => setSelectedNovelCharacter(null)}
        novelCharacter={selectedNovelCharacter}
        onConfirm={handleConfirmUpgrade}
        isUpgrading={upgradeMutation.isPending}
      />
    </>
  );
}
