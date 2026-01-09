/**
 * 派系编辑器组件
 */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import type { Faction } from "./types";
import { createNewFaction } from "./types";

interface FactionEditorProps {
  factions: Faction[];
  onChange: (factions: Faction[]) => void;
}

export function FactionEditor({ factions, onChange }: FactionEditorProps) {
  const addFaction = () => {
    onChange([...factions, createNewFaction()]);
  };

  const updateFaction = (index: number, field: keyof Faction, value: string | string[]) => {
    const newFactions = [...factions];
    newFactions[index] = { ...newFactions[index], [field]: value };
    onChange(newFactions);
  };

  const removeFaction = (index: number) => {
    onChange(factions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <Button onClick={addFaction} variant="outline">
        <Plus className="mr-2 h-4 w-4" />
        添加派系
      </Button>
      {factions.map((faction, index) => (
        <Card key={faction.id || `faction-${index}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              派系 {index + 1}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeFaction(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">名称</label>
                <Input
                  value={faction.name}
                  onChange={(e) => updateFaction(index, "name", e.target.value)}
                  placeholder="例如：天剑宗"
                />
              </div>
              <div>
                <label className="text-sm font-medium">领袖</label>
                <Input
                  value={faction.leader}
                  onChange={(e) => updateFaction(index, "leader", e.target.value)}
                  placeholder="例如：剑圣李寻欢"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">描述</label>
              <Textarea
                value={faction.description}
                onChange={(e) => updateFaction(index, "description", e.target.value)}
                placeholder="描述派系的理念、势力范围、历史..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">成员（用逗号分隔）</label>
              <Input
                value={(faction.members || []).join(", ")}
                onChange={(e) =>
                  updateFaction(
                    index,
                    "members",
                    e.target.value.split(",").map((m) => m.trim())
                  )
                }
                placeholder="例如：张三, 李四, 王五"
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
