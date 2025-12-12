"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_OPTIONS, type CharacterRole } from "./types";

interface RoleSelectorProps {
  value: CharacterRole;
  onChange: (value: CharacterRole) => void;
  disabled?: boolean;
}

export function RoleSelector({ value, onChange, disabled }: RoleSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as CharacterRole)}
      disabled={disabled}
    >
      <SelectTrigger className="w-24 h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
