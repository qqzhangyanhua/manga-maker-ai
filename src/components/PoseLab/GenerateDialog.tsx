import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { Character } from "./types";

interface GenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters: Character[];
  selectedCharacterId: string;
  onCharacterSelect: (characterId: string) => void;
  poseDescription: string;
  isGenerating: boolean;
  onConfirm: () => void;
}

/**
 * Dialog for selecting a character and confirming pose generation
 */
export function GenerateDialog({
  open,
  onOpenChange,
  characters,
  selectedCharacterId,
  onCharacterSelect,
  poseDescription,
  isGenerating,
  onConfirm,
}: GenerateDialogProps) {
  const handleCancel = () => {
    if (!isGenerating) {
      onOpenChange(false);
      onCharacterSelect("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>使用此姿势生成角色图片</DialogTitle>
          <DialogDescription>
            选择一个角色,系统将生成该角色在当前姿势下的图片
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">选择角色</label>
            <Select value={selectedCharacterId} onValueChange={onCharacterSelect}>
              <SelectTrigger>
                <SelectValue placeholder="请选择一个角色" />
              </SelectTrigger>
              <SelectContent>
                {characters.map((character) => (
                  <SelectItem key={character.id} value={character.id}>
                    {character.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCharacterId && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="text-sm font-medium">姿势描述:</div>
              <div className="text-sm text-muted-foreground">
                {poseDescription}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isGenerating}
          >
            取消
          </Button>
          <Button onClick={onConfirm} disabled={isGenerating || !selectedCharacterId}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                开始生成
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
