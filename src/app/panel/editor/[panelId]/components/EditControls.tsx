import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  BUBBLE_STYLES,
  FONT_OPTIONS,
  BubbleOptions,
  CropArea,
  FilterOptions,
} from "../types";

interface EditControlsProps {
  crop: CropArea;
  rotation: number;
  filters: FilterOptions;
  bubble: BubbleOptions;
  hasPendingEdit: boolean;
  applyingEdit: boolean;
  currentImage: string | null;
  updateCrop: (key: keyof CropArea, value: number) => void;
  updateFilter: (key: keyof FilterOptions, value: number) => void;
  updateBubble: <K extends keyof BubbleOptions>(key: K, value: BubbleOptions[K]) => void;
  updateRotation: (value: number) => void;
  handleApplyEdit: () => void;
  handleResetEdit: () => void;
  handleResetToOriginal: () => void;
}

export function EditControls({
  crop,
  rotation,
  filters,
  bubble,
  hasPendingEdit,
  applyingEdit,
  currentImage,
  updateCrop,
  updateFilter,
  updateBubble,
  updateRotation,
  handleApplyEdit,
  handleResetEdit,
  handleResetToOriginal,
}: EditControlsProps) {
  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          调整裁剪、旋转、滤镜与气泡文字，点击「应用到图片」生成新图；气泡支持拖动与拖拽调整大小
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleResetEdit}>
            重置参数
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetToOriginal}>
            恢复原图
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold">裁剪区域（百分比）</Label>
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span>左侧</span>
                <span>{crop.x.toFixed(0)}%</span>
              </div>
              <Slider value={[crop.x]} max={90} step={1} onValueChange={(value) => updateCrop("x", value[0])} />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span>上方</span>
                <span>{crop.y.toFixed(0)}%</span>
              </div>
              <Slider value={[crop.y]} max={90} step={1} onValueChange={(value) => updateCrop("y", value[0])} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span>宽度</span>
                <span>{crop.width.toFixed(0)}%</span>
              </div>
              <Slider
                value={[crop.width]}
                min={10}
                max={100}
                step={1}
                onValueChange={(value) => updateCrop("width", value[0])}
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span>高度</span>
                <span>{crop.height.toFixed(0)}%</span>
              </div>
              <Slider
                value={[crop.height]}
                min={10}
                max={100}
                step={1}
                onValueChange={(value) => updateCrop("height", value[0])}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold">旋转</Label>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span>角度</span>
            <span>{rotation.toFixed(0)}°</span>
          </div>
          <Slider
            value={[rotation]}
            min={-180}
            max={180}
            step={1}
            onValueChange={(value) => updateRotation(value[0])}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold">滤镜</Label>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>亮度</span>
              <span>{filters.brightness}%</span>
            </div>
            <Slider
              value={[filters.brightness]}
              min={50}
              max={150}
              step={1}
              onValueChange={(value) => updateFilter("brightness", value[0])}
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>对比度</span>
              <span>{filters.contrast}%</span>
            </div>
            <Slider
              value={[filters.contrast]}
              min={50}
              max={150}
              step={1}
              onValueChange={(value) => updateFilter("contrast", value[0])}
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>饱和度</span>
              <span>{filters.saturation}%</span>
            </div>
            <Slider
              value={[filters.saturation]}
              min={50}
              max={200}
              step={1}
              onValueChange={(value) => updateFilter("saturation", value[0])}
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>灰度</span>
              <span>{filters.grayscale}%</span>
            </div>
            <Slider
              value={[filters.grayscale]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) => updateFilter("grayscale", value[0])}
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>模糊</span>
              <span>{filters.blur}px</span>
            </div>
            <Slider
              value={[filters.blur]}
              min={0}
              max={10}
              step={0.5}
              onValueChange={(value) => updateFilter("blur", value[0])}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">气泡文字</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">显示</span>
            <Switch checked={bubble.show} onCheckedChange={(checked) => updateBubble("show", checked)} />
          </div>
        </div>

        <Textarea
          placeholder="在图片上叠加对白或注释"
          value={bubble.text}
          onChange={(e) => updateBubble("text", e.target.value)}
          rows={3}
          disabled={!bubble.show}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">气泡样式</Label>
            <Select
              value={bubble.style}
              onValueChange={(value) => updateBubble("style", value as BubbleOptions["style"])}
              disabled={!bubble.show}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="选择样式" />
              </SelectTrigger>
              <SelectContent>
                {BUBBLE_STYLES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">字体</Label>
            <Select
              value={bubble.fontFamily}
              onValueChange={(value) => updateBubble("fontFamily", value)}
              disabled={!bubble.show}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="选择字体" />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>水平位置</span>
              <span>{bubble.x.toFixed(0)}%</span>
            </div>
            <Slider
              value={[bubble.x]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) => updateBubble("x", value[0])}
              disabled={!bubble.show}
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>垂直位置</span>
              <span>{bubble.y.toFixed(0)}%</span>
            </div>
            <Slider
              value={[bubble.y]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) => updateBubble("y", value[0])}
              disabled={!bubble.show}
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>宽度</span>
              <span>{bubble.width.toFixed(0)}%</span>
            </div>
            <Slider
              value={[bubble.width]}
              min={20}
              max={90}
              step={1}
              onValueChange={(value) => updateBubble("width", value[0])}
              disabled={!bubble.show}
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>高度</span>
              <span>{bubble.height.toFixed(0)}%</span>
            </div>
            <Slider
              value={[bubble.height]}
              min={10}
              max={80}
              step={1}
              onValueChange={(value) => updateBubble("height", value[0])}
              disabled={!bubble.show}
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>字体</span>
              <span>{bubble.fontSize}px</span>
            </div>
            <Slider
              value={[bubble.fontSize]}
              min={12}
              max={32}
              step={1}
              onValueChange={(value) => updateBubble("fontSize", value[0])}
              disabled={!bubble.show}
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>内边距</span>
              <span>{bubble.padding}px</span>
            </div>
            <Slider
              value={[bubble.padding]}
              min={6}
              max={24}
              step={1}
              onValueChange={(value) => updateBubble("padding", value[0])}
              disabled={!bubble.show}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 items-center">
            <div className="space-y-1">
              <Label className="text-xs">文字颜色</Label>
              <Input
                type="color"
                value={bubble.color}
                onChange={(e) => updateBubble("color", e.target.value)}
                disabled={!bubble.show}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">背景色</Label>
              <Input
                type="color"
                value={bubble.background}
                onChange={(e) => updateBubble("background", e.target.value)}
                disabled={!bubble.show}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>背景不透明度</span>
              <span>{bubble.opacity}%</span>
            </div>
            <Slider
              value={[bubble.opacity]}
              min={20}
              max={100}
              step={1}
              onValueChange={(value) => updateBubble("opacity", value[0])}
              disabled={!bubble.show}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={handleApplyEdit} disabled={applyingEdit || !currentImage}>
          {applyingEdit ? "正在生成新图..." : "应用到图片"}
        </Button>
        {hasPendingEdit && (
          <p className="text-xs text-amber-600">已调整参数但未应用，保存前请先点击「应用到图片」</p>
        )}
      </div>
    </div>
  );
}
