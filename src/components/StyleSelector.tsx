/**
 * StyleSelector Component
 * 可复用的漫画风格选择器组件
 * 支持显示风格预览、颜色标记和加载状态
 */

"use client";

import { Loader2, Palette } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useComicStyles, getStyleDisplayName } from "@/hooks/useComicStyles";

export interface StyleSelectorProps {
  /**
   * 当前选中的风格 ID
   * - string: 已选择特定风格
   * - null/undefined: 未设置风格
   */
  value: string | null | undefined;

  /**
   * 选择变更回调
   * @param styleId - 新选择的风格 ID，"__default__" 表示取消选择
   */
  onValueChange: (styleId: string | null) => void;

  /**
   * 是否允许"未设置"选项（默认 true）
   */
  allowUnset?: boolean;

  /**
   * 未设置选项的显示文本（默认"未设置"）
   */
  unsetLabel?: string;

  /**
   * 选择器占位文本（默认"选择漫画风格"）
   */
  placeholder?: string;

  /**
   * 是否禁用选择器
   */
  disabled?: boolean;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 是否显示加载指示器（默认 true）
   */
  showLoadingIndicator?: boolean;
}

const DEFAULT_VALUE = "__default__";

/**
 * 漫画风格选择器
 *
 * @example
 * ```tsx
 * // 基本用法
 * <StyleSelector
 *   value={config.default_comic_style_id}
 *   onValueChange={(id) => updateStyle(id)}
 * />
 *
 * // 不允许取消选择
 * <StyleSelector
 *   value={styleId}
 *   onValueChange={setStyleId}
 *   allowUnset={false}
 * />
 *
 * // 自定义样式和文本
 * <StyleSelector
 *   value={styleId}
 *   onValueChange={setStyleId}
 *   unsetLabel="使用默认风格"
 *   placeholder="请选择风格"
 *   className="w-full"
 * />
 * ```
 */
export function StyleSelector({
  value,
  onValueChange,
  allowUnset = true,
  unsetLabel = "未设置",
  placeholder = "选择漫画风格",
  disabled = false,
  className,
  showLoadingIndicator = true,
}: StyleSelectorProps) {
  const { data, isLoading } = useComicStyles({ enabled: !disabled });

  const styles = data?.data || [];

  // 标准化值：null/undefined 转为 DEFAULT_VALUE
  const normalizedValue = value || DEFAULT_VALUE;

  // 处理选择变更
  const handleValueChange = (newValue: string) => {
    if (newValue === DEFAULT_VALUE) {
      onValueChange(null);
    } else {
      onValueChange(newValue);
    }
  };

  // 获取当前选中风格用于显示预览
  const selectedStyle = styles.find((s) => s.id === value);

  return (
    <div className="space-y-3">
      <Select
        value={normalizedValue}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className={className}>
          {isLoading && showLoadingIndicator ? (
            <div className="flex items-center gap-2 text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>加载中...</span>
            </div>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>

        <SelectContent>
          {/* 未设置选项 */}
          {allowUnset && (
            <SelectItem value={DEFAULT_VALUE}>
              <span className="text-zinc-400">{unsetLabel}</span>
            </SelectItem>
          )}

          {/* 风格列表 */}
          {styles.map((style) => (
            <SelectItem key={style.id} value={style.id}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: style.tag_color }}
                  aria-label={`风格颜色: ${style.tag_color}`}
                />
                <span className="truncate">{getStyleDisplayName(style)}</span>
              </div>
            </SelectItem>
          ))}

          {/* 空状态 */}
          {!isLoading && styles.length === 0 && (
            <div className="px-2 py-6 text-center text-sm text-zinc-500">
              暂无可用风格
            </div>
          )}
        </SelectContent>
      </Select>

      {/* 风格预览卡片 */}
      {selectedStyle && selectedStyle.image_url && (
        <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <img
            src={selectedStyle.image_url}
            alt={selectedStyle.name_zh}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {selectedStyle.name_zh}
            </p>
            {selectedStyle.prompt_prefix && (
              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                {selectedStyle.prompt_prefix}
              </p>
            )}
          </div>
          <Palette className="w-5 h-5 text-purple-400 flex-shrink-0" />
        </div>
      )}
    </div>
  );
}
