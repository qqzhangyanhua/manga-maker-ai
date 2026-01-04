/**
 * 世界观设定编辑器
 */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, MapPin, Users, BookOpen, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  LocationEditor,
  FactionEditor,
  RuleEditor,
  TimelineEditor,
  type WorldSetting,
  ensureWorldSettingFields,
} from "./world-setting";

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

        <TabsContent value="locations" className="space-y-4">
          <LocationEditor
            locations={worldSetting.locations}
            onChange={(locations) =>
              setWorldSetting({ ...worldSetting, locations })
            }
          />
        </TabsContent>

        <TabsContent value="factions" className="space-y-4">
          <FactionEditor
            factions={worldSetting.factions}
            onChange={(factions) =>
              setWorldSetting({ ...worldSetting, factions })
            }
          />
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <RuleEditor
            rules={worldSetting.rules}
            onChange={(rules) =>
              setWorldSetting({ ...worldSetting, rules })
            }
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <TimelineEditor
            timeline={worldSetting.timeline}
            onChange={(timeline) =>
              setWorldSetting({ ...worldSetting, timeline })
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
