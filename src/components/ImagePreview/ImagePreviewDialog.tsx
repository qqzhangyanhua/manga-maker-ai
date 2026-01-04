"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import Image from "next/image";

interface ImagePreviewDialogProps {
  open: boolean;
  imageUrl: string | null;
  onOpenChange: (open: boolean) => void;
}

export function ImagePreviewDialog({
  open,
  imageUrl,
  onOpenChange,
}: ImagePreviewDialogProps) {
  if (!imageUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>图片预览</DialogTitle>
        </VisuallyHidden>
        <div className="relative w-full h-full flex items-center justify-center bg-black/90">
          <div className="relative w-full h-[80vh]">
            <Image
              src={imageUrl}
              alt="Preview"
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
