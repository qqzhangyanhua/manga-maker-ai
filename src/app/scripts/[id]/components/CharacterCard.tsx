"use client";

import { memo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, ROLE_COLORS } from "../constants/characterRoles";
import type { CharacterInfo } from "../types/character";

interface CharacterCardProps {
  character: CharacterInfo;
  role: string;
  onSelect: (character: CharacterInfo, role: string) => void;
}

/**
 * 角色卡片组件
 *
 * 性能优化:
 * - 使用 React.memo 防止不必要的重渲染
 * - onClick 使用 useCallback 避免在每次渲染时创建新函数
 */
export const CharacterCard = memo(function CharacterCard({
  character,
  role,
  onSelect,
}: CharacterCardProps) {
  const handleClick = useCallback(() => {
    onSelect(character, role);
  }, [character, role, onSelect]);

  return (
    <div
      onClick={handleClick}
      className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
    >
      {/* 角色头像 */}
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
        {character.name.charAt(0)}
      </div>

      {/* 角色名称 */}
      <div className="text-center">
        <div className="font-medium text-sm truncate max-w-[100px]">
          {character.name}
        </div>

        {/* 角色标签 */}
        {role && (
          <Badge
            variant="secondary"
            className={`mt-1 text-xs ${ROLE_COLORS[role]} text-white`}
          >
            {ROLE_LABELS[role] || role}
          </Badge>
        )}
      </div>
    </div>
  );
});
