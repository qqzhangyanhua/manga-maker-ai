"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, MapPin, Users, BookOpen, Clock } from "lucide-react";
import { toast } from "sonner";

interface Location {
  name: string;
  description: string;
  type: string; // 城市、森林、山脉等
}

interface Faction {
  name: string;
  description: string;
  leader: string;
  members: string[];
}

interface Rule {
  title: string;
  description: string;
  category: string; // 魔法、科技、社会等
}

interface TimelineEvent {
  year: string;
  event: string;
  importance: "high" | "medium" | "low";
}

interface WorldSetting {
  locations: Location[];
  factions: Faction[];
  rules: Rule[];
  timeline: TimelineEvent[];
}

/**
 * 确保 WorldSetting 所有字段都正确初始化
 */
function ensureWorldSettingFields(data: any): WorldSetting {
  return {
    locations: Array.isArray(data?.locations)
      ? data.locations.map((loc: any) => ({
          name: loc?.name ?? "",
          description: loc?.description ?? "",
          type: loc?.type ?? "",
        }))
      : [],
    factions: Array.isArray(data?.factions)
      ? data.factions.map((faction: any) => ({
          name: faction?.name ?? "",
          description: faction?.description ?? "",
          leader: faction?.leader ?? "",
          members: Array.isArray(faction?.members) ? faction.members : [],
        }))
      : [],
    rules: Array.isArray(data?.rules)
      ? data.rules.map((rule: any) => ({
          title: rule?.title ?? "",
          description: rule?.description ?? "",
          category: rule?.category ?? "",
        }))
      : [],
    timeline: Array.isArray(data?.timeline)
      ? data.timeline.map((event: any) => ({
          year: event?.year ?? "",
          event: event?.event ?? "",
          importance: event?.importance ?? "medium",
        }))
      : [],
  };
}

interface WorldSettingEditorProps {
  projectId: string;
  initialData: WorldSetting | null;
  onSave: (data: WorldSetting) => Promise<void>;
}

export function WorldSettingEditor({
  projectId,
  initialData,
  onSave,
}: WorldSettingEditorProps) {
  const [worldSetting, setWorldSetting] = useState<WorldSetting>(
    ensureWorldSettingFields(initialData)
  );
  const [isSaving, setIsSaving] = useState(false);

  // 当 initialData 变化时更新 worldSetting
  useEffect(() => {
    setWorldSetting(ensureWorldSettingFields(initialData));
  }, [initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(worldSetting);
      toast.success("世界观设定已保存");
    } catch (error) {
      toast.error("保存失败");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // 地点管理
  const addLocation = () => {
    setWorldSetting({
      ...worldSetting,
      locations: [
        ...worldSetting.locations,
        { name: "", description: "", type: "" },
      ],
    });
  };

  const updateLocation = (index: number, field: keyof Location, value: string) => {
    const newLocations = [...worldSetting.locations];
    newLocations[index] = { ...newLocations[index], [field]: value };
    setWorldSetting({ ...worldSetting, locations: newLocations });
  };

  const removeLocation = (index: number) => {
    setWorldSetting({
      ...worldSetting,
      locations: worldSetting.locations.filter((_, i) => i !== index),
    });
  };

  // 派系管理
  const addFaction = () => {
    setWorldSetting({
      ...worldSetting,
      factions: [
        ...worldSetting.factions,
        { name: "", description: "", leader: "", members: [] },
      ],
    });
  };

  const updateFaction = (index: number, field: keyof Faction, value: string | string[]) => {
    const newFactions = [...worldSetting.factions];
    newFactions[index] = { ...newFactions[index], [field]: value };
    setWorldSetting({ ...worldSetting, factions: newFactions });
  };

  const removeFaction = (index: number) => {
    setWorldSetting({
      ...worldSetting,
      factions: worldSetting.factions.filter((_, i) => i !== index),
    });
  };

  // 规则管理
  const addRule = () => {
    setWorldSetting({
      ...worldSetting,
      rules: [
        ...worldSetting.rules,
        { title: "", description: "", category: "" },
      ],
    });
  };

  const updateRule = (index: number, field: keyof Rule, value: string) => {
    const newRules = [...worldSetting.rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setWorldSetting({ ...worldSetting, rules: newRules });
  };

  const removeRule = (index: number) => {
    setWorldSetting({
      ...worldSetting,
      rules: worldSetting.rules.filter((_, i) => i !== index),
    });
  };

  // 时间线管理
  const addTimelineEvent = () => {
    setWorldSetting({
      ...worldSetting,
      timeline: [
        ...worldSetting.timeline,
        { year: "", event: "", importance: "medium" },
      ],
    });
  };

  const updateTimelineEvent = (
    index: number,
    field: keyof TimelineEvent,
    value: string
  ) => {
    const newTimeline = [...worldSetting.timeline];
    newTimeline[index] = { ...newTimeline[index], [field]: value };
    setWorldSetting({ ...worldSetting, timeline: newTimeline });
  };

  const removeTimelineEvent = (index: number) => {
    setWorldSetting({
      ...worldSetting,
      timeline: worldSetting.timeline.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">世界观设定</h2>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "保存中..." : "保存"}
        </Button>
      </div>

      <Tabs defaultValue="locations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="locations">
            <MapPin className="mr-2 h-4 w-4" />
            地点
          </TabsTrigger>
          <TabsTrigger value="factions">
            <Users className="mr-2 h-4 w-4" />
            派系
          </TabsTrigger>
          <TabsTrigger value="rules">
            <BookOpen className="mr-2 h-4 w-4" />
            规则
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Clock className="mr-2 h-4 w-4" />
            时间线
          </TabsTrigger>
        </TabsList>

        {/* 地点 */}
        <TabsContent value="locations" className="space-y-4">
          <Button onClick={addLocation} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            添加地点
          </Button>
          {worldSetting.locations.map((location, index) => (
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
                      onChange={(e) =>
                        updateLocation(index, "name", e.target.value)
                      }
                      placeholder="例如：龙渊城"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">类型</label>
                    <Input
                      value={location.type}
                      onChange={(e) =>
                        updateLocation(index, "type", e.target.value)
                      }
                      placeholder="例如：城市、森林、山脉"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">描述</label>
                  <Textarea
                    value={location.description}
                    onChange={(e) =>
                      updateLocation(index, "description", e.target.value)
                    }
                    placeholder="详细描述这个地点的特征、历史、重要性..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* 派系 */}
        <TabsContent value="factions" className="space-y-4">
          <Button onClick={addFaction} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            添加派系
          </Button>
          {worldSetting.factions.map((faction, index) => (
            <Card key={index}>
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
                      onChange={(e) =>
                        updateFaction(index, "name", e.target.value)
                      }
                      placeholder="例如：天剑宗"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">领袖</label>
                    <Input
                      value={faction.leader}
                      onChange={(e) =>
                        updateFaction(index, "leader", e.target.value)
                      }
                      placeholder="例如：剑圣李寻欢"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">描述</label>
                  <Textarea
                    value={faction.description}
                    onChange={(e) =>
                      updateFaction(index, "description", e.target.value)
                    }
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
        </TabsContent>

        {/* 规则 */}
        <TabsContent value="rules" className="space-y-4">
          <Button onClick={addRule} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            添加规则
          </Button>
          {worldSetting.rules.map((rule, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  规则 {index + 1}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRule(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">标题</label>
                    <Input
                      value={rule.title}
                      onChange={(e) =>
                        updateRule(index, "title", e.target.value)
                      }
                      placeholder="例如：魔法等级体系"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">分类</label>
                    <Input
                      value={rule.category}
                      onChange={(e) =>
                        updateRule(index, "category", e.target.value)
                      }
                      placeholder="例如：魔法、科技、社会"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">详细说明</label>
                  <Textarea
                    value={rule.description}
                    onChange={(e) =>
                      updateRule(index, "description", e.target.value)
                    }
                    placeholder="详细描述这个规则的运作方式、限制、特例..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* 时间线 */}
        <TabsContent value="timeline" className="space-y-4">
          <Button onClick={addTimelineEvent} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            添加事件
          </Button>
          <div className="space-y-2">
            {worldSetting.timeline
              .sort((a, b) => a.year.localeCompare(b.year))
              .map((event, index) => (
                <Card key={index}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <Input
                        value={event.year}
                        onChange={(e) =>
                          updateTimelineEvent(index, "year", e.target.value)
                        }
                        placeholder="年份/时期"
                      />
                      <Input
                        value={event.event}
                        onChange={(e) =>
                          updateTimelineEvent(index, "event", e.target.value)
                        }
                        placeholder="事件描述"
                        className="col-span-2"
                      />
                    </div>
                    <select
                      value={event.importance}
                      onChange={(e) =>
                        updateTimelineEvent(
                          index,
                          "importance",
                          e.target.value as "high" | "medium" | "low"
                        )
                      }
                      className="rounded-md border px-3 py-2"
                    >
                      <option value="high">重要</option>
                      <option value="medium">一般</option>
                      <option value="low">次要</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTimelineEvent(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
