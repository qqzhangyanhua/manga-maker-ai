"use client";

/**
 * 气泡样式选择器组件
 * 提供预设气泡样式选择
 */

import { useState, useCallback } from "react";
import {
  MessageCircle,
  Cloud,
  Zap,
  Volume2,
  FileText,
  Radio,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DEFAULT_BUBBLE_STYLES, type BubbleStyleConfig, type BubbleType } from "@/types/layout";

interface BubbleSelectorProps {
  onSelect: (styleConfig: BubbleStyleConfig) => void;
  selectedType?: BubbleType;
  disabled?: boolean;
}

const BUBBLE_TYPE_ICONS: Record<BubbleType, React.ReactNode> = {
  speech: <MessageCircle className="h-4 w-4" />,
  thought: <Cloud className="h-4 w-4" />,
  shout: <Zap className="h-4 w-4" />,
  whisper: <Volume2 className="h-4 w-4" />,
  narration: <FileText className="h-4 w-4" />,
  electronic: <Radio className="h-4 w-4" />,
};

const BUBBLE_TYPE_LABELS: Record<BubbleType, string> = {
  speech: "对话",
  thought: "思考",
  shout: "呐喊",
  whisper: "悄悄话",
  narration: "旁白",
  electronic: "电子音",
};

export function BubbleSelector({
  onSelect,
  selectedType,
  disabled = false,
}: BubbleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = useCallback(
    (style: (typeof DEFAULT_BUBBLE_STYLES)[number]) => {
      onSelect(style.styleConfig);
      setIsOpen(false);
    },
    [onSelect]
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <MessageCircle className="h-4 w-4 mr-2" />
          气泡样式
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">选择气泡样式</h4>
          <p className="text-xs text-muted-foreground mt-1">
            点击气泡样式添加到画布
          </p>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-3 space-y-2">
            {DEFAULT_BUBBLE_STYLES.map((style, index) => (
              <BubbleStyleCard
                key={index}
                style={style}
                isSelected={selectedType === style.type}
                onClick={() => handleSelect(style)}
              />
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

interface BubbleStyleCardProps {
  style: (typeof DEFAULT_BUBBLE_STYLES)[number];
  isSelected: boolean;
  onClick: () => void;
}

function BubbleStyleCard({ style, isSelected, onClick }: BubbleStyleCardProps) {
  const { styleConfig } = style;

  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
        "hover:border-primary hover:bg-muted/50",
        isSelected && "border-primary bg-primary/5"
      )}
      onClick={onClick}
    >
      {/* 气泡预览 */}
      <div className="relative flex-shrink-0">
        <BubblePreview styleConfig={styleConfig} />
        {isSelected && (
          <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
            <Check className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* 气泡信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {BUBBLE_TYPE_ICONS[style.type]}
          <span className="font-medium text-sm">{style.name}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {BUBBLE_TYPE_LABELS[style.type]} · {styleConfig.shape}
        </div>
      </div>
    </button>
  );
}

interface BubblePreviewProps {
  styleConfig: BubbleStyleConfig;
  size?: number;
}

function BubblePreview({ styleConfig, size = 48 }: BubblePreviewProps) {
  const getShapePath = () => {
    switch (styleConfig.shape) {
      case "rounded":
        return (
          <rect
            x="4"
            y="4"
            width={size - 8}
            height={size - 16}
            rx="8"
            ry="8"
          />
        );
      case "cloud":
        return (
          <ellipse
            cx={size / 2}
            cy={size / 2 - 4}
            rx={(size - 12) / 2}
            ry={(size - 20) / 2}
          />
        );
      case "explosion":
        // 爆炸形状用多边形表示
        const points = [];
        const centerX = size / 2;
        const centerY = size / 2 - 4;
        const outerRadius = (size - 12) / 2;
        const innerRadius = outerRadius * 0.6;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const r = i % 2 === 0 ? outerRadius : innerRadius;
          points.push(`${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`);
        }
        return <polygon points={points.join(" ")} />;
      case "rectangle":
        return (
          <rect
            x="4"
            y="4"
            width={size - 8}
            height={size - 16}
            rx="2"
            ry="2"
          />
        );
      default:
        return (
          <rect
            x="4"
            y="4"
            width={size - 8}
            height={size - 16}
            rx="8"
            ry="8"
          />
        );
    }
  };

  const getTailPath = () => {
    if (!styleConfig.tailEnabled) return null;

    const tailX = size / 2;
    const tailY = size - 8;
    const tailWidth = 8;
    const tailHeight = 6;

    switch (styleConfig.tailStyle) {
      case "curved":
        return (
          <path
            d={`M${tailX - tailWidth / 2},${tailY - tailHeight} Q${tailX},${tailY + 2} ${tailX + tailWidth / 2},${tailY - tailHeight}`}
          />
        );
      case "zigzag":
        return (
          <path
            d={`M${tailX - tailWidth / 2},${tailY - tailHeight} L${tailX - 2},${tailY - 2} L${tailX},${tailY + 2} L${tailX + 2},${tailY - 2} L${tailX + tailWidth / 2},${tailY - tailHeight}`}
          />
        );
      default:
        return (
          <polygon
            points={`${tailX - tailWidth / 2},${tailY - tailHeight} ${tailX},${tailY + 2} ${tailX + tailWidth / 2},${tailY - tailHeight}`}
          />
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="flex-shrink-0"
    >
      <g
        fill={styleConfig.backgroundColor}
        stroke={styleConfig.borderColor}
        strokeWidth={styleConfig.borderWidth}
        strokeDasharray={styleConfig.borderStyle === "dashed" ? "4,2" : undefined}
        opacity={styleConfig.backgroundOpacity}
      >
        {getShapePath()}
        {getTailPath()}
      </g>
    </svg>
  );
}

export { BubblePreview };
