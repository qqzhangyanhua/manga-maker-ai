/**
 * 地点编辑器组件
 */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import type { Location } from "./types";
import { createNewLocation } from "./types";

interface LocationEditorProps {
  locations: Location[];
  onChange: (locations: Location[]) => void;
}

export function LocationEditor({ locations, onChange }: LocationEditorProps) {
  const addLocation = () => {
    onChange([...locations, createNewLocation()]);
  };

  const updateLocation = (index: number, field: keyof Location, value: string) => {
    const newLocations = [...locations];
    newLocations[index] = { ...newLocations[index], [field]: value };
    onChange(newLocations);
  };

  const removeLocation = (index: number) => {
    onChange(locations.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <Button onClick={addLocation} variant="outline">
        <Plus className="mr-2 h-4 w-4" />
        添加地点
      </Button>
      {locations.map((location, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              地点 {index + 1}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeLocation(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">名称</label>
                <Input
                  value={location.name}
                  onChange={(e) => updateLocation(index, "name", e.target.value)}
                  placeholder="例如：龙渊城"
                />
              </div>
              <div>
                <label className="text-sm font-medium">类型</label>
                <Input
                  value={location.type}
                  onChange={(e) => updateLocation(index, "type", e.target.value)}
                  placeholder="例如：城市、森林、山脉"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">描述</label>
              <Textarea
                value={location.description}
                onChange={(e) => updateLocation(index, "description", e.target.value)}
                placeholder="详细描述这个地点的特征、历史、重要性..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
