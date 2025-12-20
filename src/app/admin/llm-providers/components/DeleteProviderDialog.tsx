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
import type { Provider } from "../types";

interface DeleteProviderDialogProps {
  provider: Provider | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const DeleteProviderDialog = ({
  provider,
  onOpenChange,
  onConfirm,
}: DeleteProviderDialogProps) => {
  return (
    <AlertDialog open={!!provider} onOpenChange={(open) => !open && onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除模型配置</AlertDialogTitle>
          <AlertDialogDescription>
            {provider && (
              <>
                确定要删除模型配置吗？
                <br />
                <strong>类型：</strong>
                {provider.provider_type}
                <br />
                <strong>模型：</strong>
                {provider.model}
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












