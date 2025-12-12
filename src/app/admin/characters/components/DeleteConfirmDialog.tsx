import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Character } from "../types";

type DeleteConfirmDialogProps = {
  character: Character | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export const DeleteConfirmDialog = ({
  character,
  onOpenChange,
  onConfirm,
}: DeleteConfirmDialogProps) => {
  return (
    <AlertDialog open={!!character} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除角色</AlertDialogTitle>
          <AlertDialogDescription>
            {character && (
              <>
                确定删除角色「<strong>{character.name}</strong>」吗？
                <br />
                此操作不可恢复。
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
