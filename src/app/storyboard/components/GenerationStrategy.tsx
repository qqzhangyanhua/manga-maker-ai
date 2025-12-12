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
    <div className="comic-card p-4 mb-6">
      <div className="flex flex-col gap-2 text-sm">
        <div className="font-medium text-foreground">本次生成策略</div>
        <div className="text-muted-foreground">
          角色：
          {defaultCharacterId
            ? characters.find((c) => c.id === defaultCharacterId)?.name || "未知"
            : "不锁定"}
          {defaultCharacterId &&
            characters.find((c) => c.id === defaultCharacterId)?.viewCount === 0
            ? "（缺三视图）"
            : ""}
        </div>
        <div className="text-muted-foreground">
          风格：
          {defaultStyleKey
            ? styles.find((s) => s.style_key === defaultStyleKey)?.name_zh || defaultStyleKey
            : "跟随项目"}
        </div>
        <div className="text-muted-foreground">柔和模式：{softMode ? "开启" : "关闭"}</div>
        {Object.keys(promptErrors).length > 0 && (
          <div className="text-amber-600 dark:text-amber-500">
            有 {Object.keys(promptErrors).length} 个分镜提示词生成失败，将被跳过：
            {Object.keys(promptErrors).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
};
