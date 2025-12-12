"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Check, RefreshCw, Image as ImageIcon } from "lucide-react";
import { PanelVariant } from "@/types/template";
import { cn } from "@/lib/utils";

interface VariantSelectorProps {
  panelId: string;
  variants: PanelVariant[];
  originalImageUrl?: string | null;
  isLoading?: boolean;
  onSelect: (variantId: string) => Promise<void>;
  onRegenerate?: () => void;
}

export function VariantSelector({
  panelId,
  variants,
  originalImageUrl,
  isLoading = false,
  onSelect,
  onRegenerate
}: VariantSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    variants.find(v => v.is_selected)?.id || null
  );
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const handleSelect = async (variantId: string) => {
    setSelectingId(variantId);
    try {
      await onSelect(variantId);
      setSelectedId(variantId);
    } catch (error) {
      console.error("Failed to select variant:", error);
    } finally {
      setSelectingId(null);
    }
  };

  const getVariantTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      original: "原始版本",
      composition: "构图变体",
      lighting: "光线变体",
      angle: "角度变体"
    };
    return labels[type] || type;
  };

  const getVariantTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      original: "bg-blue-500/10 text-blue-700 border-blue-300",
      composition: "bg-green-500/10 text-green-700 border-green-300",
      lighting: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
      angle: "bg-purple-500/10 text-purple-700 border-purple-300"
    };
    return colors[type] || "bg-gray-500/10 text-gray-700 border-gray-300";
  };

  if (variants.length === 0 && !originalImageUrl) {
    return (
      <Card className="p-8 text-center">
        <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-4">暂无变体</p>
        {onRegenerate && (
          <Button onClick={onRegenerate} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            生成变体
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">选择变体</h3>
          <p className="text-sm text-muted-foreground">
            共 {variants.length} 个变体可选
          </p>
        </div>
        {onRegenerate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            重新生成
          </Button>
        )}
      </div>

      {/* Variant grid */}
      <RadioGroup value={selectedId || undefined} onValueChange={handleSelect}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {variants.map((variant) => {
            const isSelected = variant.id === selectedId;
            const isSelecting = variant.id === selectingId;

            return (
              <Card
                key={variant.id}
                className={cn(
                  "relative overflow-hidden cursor-pointer transition-all",
                  isSelected && "ring-2 ring-primary",
                  isSelecting && "opacity-50"
                )}
                onClick={() => !isSelecting && handleSelect(variant.id)}
              >
                {/* Image */}
                <div className="aspect-video bg-muted relative">
                  {variant.image_url ? (
                    <img
                      src={variant.image_url}
                      alt={getVariantTypeLabel(variant.variant_type)}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    </div>
                  )}

                  {/* Loading overlay */}
                  {isSelecting && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className={cn("text-xs", getVariantTypeColor(variant.variant_type))}>
                      {getVariantTypeLabel(variant.variant_type)}
                    </Badge>
                    <RadioGroupItem
                      value={variant.id}
                      id={variant.id}
                      className="data-[state=checked]:border-primary"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {variant.prompt}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </RadioGroup>

      {/* Selected info */}
      {selectedId && (
        <Alert className="bg-primary/5 border-primary/20">
          <Check className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            已选择变体。此变体将应用到分镜中。
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
