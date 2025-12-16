import { CharacterOption, StyleOption, GenerationStrategyProps } from "../types";

export const GenerationStrategy = ({
  characters,
  styles,
  defaultCharacterId,
  defaultStyleKey,
  softMode,
  promptErrors,
}: GenerationStrategyProps) => {
  return (
    <div className="relative rounded-xl border border-zinc-700 bg-zinc-900/60 backdrop-blur-md p-4 mb-6 overflow-hidden shadow-lg">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
      <div className="flex flex-col gap-2 text-sm">
        <div className="font-medium text-white">本次生成策略</div>
        <div className="text-zinc-400">
          角色：
          {defaultCharacterId
            ? characters.find((c) => c.id === defaultCharacterId)?.name || "未知"
            : "不锁定"}
          {defaultCharacterId &&
            characters.find((c) => c.id === defaultCharacterId)?.viewCount === 0
            ? "（缺三视图）"
            : ""}
        </div>
        <div className="text-zinc-400">
          风格：
          {defaultStyleKey
            ? styles.find((s) => s.style_key === defaultStyleKey)?.name_zh || defaultStyleKey
            : "跟随项目"}
        </div>
        <div className="text-zinc-400">柔和模式：{softMode ? "开启" : "关闭"}</div>
        {Object.keys(promptErrors).length > 0 && (
          <div className="text-amber-500">
            有 {Object.keys(promptErrors).length} 个分镜提示词生成失败，将被跳过：
            {Object.keys(promptErrors).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
};
