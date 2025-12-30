"use client";

/**
 * 属性面板组件
 * 用于编辑选中对象的属性
 */

import { useState, useEffect, useCallback } from "react";
import * as fabric from "fabric";
import { Palette, Move, Maximize2, RotateCw, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ObjectProperties {
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  opacity: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

interface PropertyPanelProps {
  canvas: fabric.Canvas | null;
  selectedObject: fabric.FabricObject | null;
  onPropertyChange?: () => void;
}

function getObjectProperties(obj: fabric.FabricObject): ObjectProperties {
  const bounds = obj.getBoundingRect();
  return {
    left: Math.round(obj.left || 0),
    top: Math.round(obj.top || 0),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
    scaleX: obj.scaleX || 1,
    scaleY: obj.scaleY || 1,
    angle: Math.round(obj.angle || 0),
    opacity: obj.opacity || 1,
    fill: typeof obj.fill === "string" ? obj.fill : "#000000",
    stroke: typeof obj.stroke === "string" ? obj.stroke : "#000000",
    strokeWidth: obj.strokeWidth || 0,
  };
}

export function PropertyPanel({
  canvas,
  selectedObject,
  onPropertyChange,
}: PropertyPanelProps) {
  const [properties, setProperties] = useState<ObjectProperties | null>(null);

  // 更新属性状态
  useEffect(() => {
    if (selectedObject) {
      setProperties(getObjectProperties(selectedObject));
    } else {
      setProperties(null);
    }
  }, [selectedObject]);

  // 通用属性更新
  const updateProperty = useCallback(
    (key: keyof ObjectProperties, value: number | string) => {
      if (!canvas || !selectedObject) return;

      selectedObject.set({ [key]: value });
      canvas.renderAll();
      setProperties(getObjectProperties(selectedObject));
      onPropertyChange?.();
    },
    [canvas, selectedObject, onPropertyChange]
  );

  // 更新尺寸（通过 scale 实现）
  const updateSize = useCallback(
    (dimension: "width" | "height", value: number) => {
      if (!canvas || !selectedObject || !properties) return;

      const currentBounds = selectedObject.getBoundingRect();
      if (dimension === "width") {
        const newScaleX = value / (currentBounds.width / (selectedObject.scaleX || 1));
        selectedObject.set({ scaleX: newScaleX });
      } else {
        const newScaleY = value / (currentBounds.height / (selectedObject.scaleY || 1));
        selectedObject.set({ scaleY: newScaleY });
      }

      canvas.renderAll();
      setProperties(getObjectProperties(selectedObject));
      onPropertyChange?.();
    },
    [canvas, selectedObject, properties, onPropertyChange]
  );

  if (!selectedObject || !properties) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        选择对象以编辑属性
      </div>
    );
  }

  return (
    <div className="p-2">
      <Accordion type="multiple" defaultValue={["position", "size", "appearance"]} className="w-full">
        {/* 位置 */}
        <AccordionItem value="position">
          <AccordionTrigger className="text-sm py-2">
            <div className="flex items-center gap-2">
              <Move className="h-4 w-4" />
              位置
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">X</Label>
                <Input
                  type="number"
                  value={properties.left}
                  onChange={(e) => updateProperty("left", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Y</Label>
                <Input
                  type="number"
                  value={properties.top}
                  onChange={(e) => updateProperty("top", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <RotateCw className="h-3 w-3" />
                旋转角度
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Slider
                  value={[properties.angle]}
                  onValueChange={([v]) => updateProperty("angle", v)}
                  min={0}
                  max={360}
                  step={1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={properties.angle}
                  onChange={(e) => updateProperty("angle", Number(e.target.value))}
                  className="w-16 h-8 text-sm"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 尺寸 */}
        <AccordionItem value="size">
          <AccordionTrigger className="text-sm py-2">
            <div className="flex items-center gap-2">
              <Maximize2 className="h-4 w-4" />
              尺寸
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">宽度</Label>
                <Input
                  type="number"
                  value={properties.width}
                  onChange={(e) => updateSize("width", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">高度</Label>
                <Input
                  type="number"
                  value={properties.height}
                  onChange={(e) => updateSize("height", Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 外观 */}
        <AccordionItem value="appearance">
          <AccordionTrigger className="text-sm py-2">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              外观
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-2">
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="h-3 w-3" />
                不透明度
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Slider
                  value={[properties.opacity * 100]}
                  onValueChange={([v]) => updateProperty("opacity", v / 100)}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs w-10 text-right">
                  {Math.round(properties.opacity * 100)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">填充颜色</Label>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="color"
                    value={properties.fill}
                    onChange={(e) => updateProperty("fill", e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border"
                  />
                  <Input
                    type="text"
                    value={properties.fill}
                    onChange={(e) => updateProperty("fill", e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">描边颜色</Label>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="color"
                    value={properties.stroke}
                    onChange={(e) => updateProperty("stroke", e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border"
                  />
                  <Input
                    type="text"
                    value={properties.stroke}
                    onChange={(e) => updateProperty("stroke", e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">描边宽度</Label>
              <div className="flex items-center gap-2 mt-1">
                <Slider
                  value={[properties.strokeWidth]}
                  onValueChange={([v]) => updateProperty("strokeWidth", v)}
                  min={0}
                  max={20}
                  step={1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={properties.strokeWidth}
                  onChange={(e) => updateProperty("strokeWidth", Number(e.target.value))}
                  className="w-16 h-8 text-sm"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
