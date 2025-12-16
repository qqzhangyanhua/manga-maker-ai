import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CharacterOption, StyleOption, GenerationSettingsProps } from "../types";

const NO_SELECTION_VALUE = "__none__";

export const GenerationSettings = ({
  characters,
  styles,
  defaultCharacterId,
  defaultStyleKey,
  softMode,
  onCharacterChange,
  onStyleChange,
  onSoftModeChange,
}: GenerationSettingsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="relative rounded-xl border border-zinc-700 bg-zinc-900/60 backdrop-blur-md p-4 overflow-hidden shadow-lg">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
        <div className="text-xs text-zinc-400 mb-1">默认锁脸角色</div>
        <Select
          value={defaultCharacterId ?? NO_SELECTION_VALUE}
          onValueChange={(val) => onCharacterChange(val === NO_SELECTION_VALUE ? undefined : val)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="不锁定" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SELECTION_VALUE}>不锁定</SelectItem>
            {characters.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} {c.viewCount === 0 ? "（缺三视图）" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {defaultCharacterId && characters.find((c) => c.id === defaultCharacterId)?.viewCount === 0 && (
          <p className="mt-1 text-[11px] text-amber-500">
            当前角色缺少三视图，可能导致角色不一致
          </p>
        )}
      </div>
      <div className="relative rounded-xl border border-zinc-700 bg-zinc-900/60 backdrop-blur-md p-4 overflow-hidden shadow-lg">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
        <div className="text-xs text-zinc-400 mb-1">默认漫画风格</div>
        <Select
          value={defaultStyleKey ?? NO_SELECTION_VALUE}
          onValueChange={(val) => onStyleChange(val === NO_SELECTION_VALUE ? undefined : val)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="跟随项目风格" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SELECTION_VALUE}>跟随项目风格</SelectItem>
            {styles.map((s) => (
              <SelectItem key={s.style_key} value={s.style_key}>
                {s.name_zh} ({s.name_en})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="relative rounded-xl border border-zinc-700 bg-zinc-900/60 backdrop-blur-md p-4 flex items-center justify-between overflow-hidden shadow-lg">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
        <div>
          <div className="text-sm font-medium text-white">柔和模式</div>
          <div className="text-xs text-zinc-400">自动替换敏感词，减少安全拦截</div>
        </div>
        <Switch checked={softMode} onCheckedChange={onSoftModeChange} />
      </div>
    </div>
  );
};
