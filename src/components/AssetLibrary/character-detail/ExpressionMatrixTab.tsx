import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import ImagePreviewCard from "../ImagePreviewCard";
import { expressions } from "./constants";
import type { UploadType } from "./types";

interface ExpressionMatrixTabProps {
  expressionSheet: Record<string, string>;
  allExpressionsGenerating: boolean;
  selectedExpression: string | null;
  isGenerating: boolean;
  isUploading: boolean;
  onGenerateExpression: (expressionId: string) => void;
  onGenerateAllExpressions: () => void;
  onOpenUploadDialog: (expressionId: UploadType) => void;
}

const ExpressionMatrixTab = ({
  expressionSheet,
  allExpressionsGenerating,
  selectedExpression,
  isGenerating,
  isUploading,
  onGenerateExpression,
  onGenerateAllExpressions,
  onOpenUploadDialog,
}: ExpressionMatrixTabProps) => {
  return (
    <div className="comic-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-comic text-xl text-foreground">表情与姿态矩阵</h3>
          <p className="text-sm text-muted-foreground">
            生成角色的喜怒哀乐表情，拖拽到分镜中使用
          </p>
        </div>
        <Button
          variant="comic"
          onClick={onGenerateAllExpressions}
          disabled={isGenerating}
        >
          <Sparkles className="w-4 h-4" />
          一键生成全部
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {expressions.map((exp) => (
          <ImagePreviewCard
            key={exp.id}
            imageUrl={expressionSheet[exp.id]}
            label={`${exp.emoji} ${exp.label}`}
            aspectRatio="square"
            isGenerating={
              (allExpressionsGenerating && !expressionSheet[exp.id]) ||
              ((selectedExpression === exp.id || isUploading) && !allExpressionsGenerating)
            }
            onGenerate={() => onGenerateExpression(exp.id)}
            onUpload={() => onOpenUploadDialog(exp.id)}
            onRegenerate={() => onGenerateExpression(exp.id)}
            onReplace={() => onOpenUploadDialog(exp.id)}
            showGenerateButton={true}
            showUploadButton={true}
          />
        ))}
      </div>
    </div>
  );
};

export default ExpressionMatrixTab;
