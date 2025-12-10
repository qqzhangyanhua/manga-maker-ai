/**
 * 角色选择器组件
 * 从故事角色列表中选择，或手动输入
 */

"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StoryCharacter } from "../../types/script-editor.types";

interface CharacterSelectorProps {
  characters: StoryCharacter[];
  value: string;
  onChange: (value: string) => void;
}

export function CharacterSelector({
  characters,
  value,
  onChange,
}: CharacterSelectorProps) {
  // 如果没有角色数据，降级到输入框
  if (!characters || characters.length === 0) {
    return (
      <Input
        placeholder="角色名称（手动输入）"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="选择角色" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">（无）</SelectItem>
        {characters.map((char) => (
          <SelectItem key={char.name} value={char.name}>
            <div className="flex flex-col">
              <span className="font-medium">{char.name}</span>
              <span className="text-xs text-muted-foreground">
                {char.role}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
