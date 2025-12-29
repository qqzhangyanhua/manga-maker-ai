import { Wand2, BookOpen, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ScriptInput from "@/components/Storyboard/ScriptInput";
import NarrativeTemplateSelector from "@/components/Storyboard/NarrativeTemplateSelector";
import { TabValue } from "../constants";

type ScriptInputSectionProps = {
  activeTab: TabValue;
  onTabChange: (value: TabValue) => void;
  initialScript: string | null;
  isGenerating: boolean;
  onGenerate: (script: string) => void;
  selectedTemplate: string | null;
  onSelectTemplate: (template: string | null) => void;
  templateData: Record<string, string>;
  onTemplateDataChange: (data: Record<string, string>) => void;
  onTemplateGenerate: () => void;
};

export function ScriptInputSection({
  activeTab,
  onTabChange,
  initialScript,
  isGenerating,
  onGenerate,
  selectedTemplate,
  onSelectTemplate,
  templateData,
  onTemplateDataChange,
  onTemplateGenerate,
}: ScriptInputSectionProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as TabValue)}>
      <TabsList className="grid grid-cols-2 w-full">
        <TabsTrigger value="freeform" className="flex items-center gap-1">
          <Wand2 className="w-4 h-4" />
          自由创作
        </TabsTrigger>
        <TabsTrigger value="template" className="flex items-center gap-1">
          <BookOpen className="w-4 h-4" />
          结构模板
        </TabsTrigger>
      </TabsList>

      <TabsContent value="freeform" className="mt-4">
        <div className="relative rounded-xl border border-zinc-700 bg-zinc-900/60 backdrop-blur-md p-6 overflow-hidden shadow-lg">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
          <div className="flex items-center gap-2 mb-4">
            <Wand2 className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-semibold text-white">小说转漫画</h2>
          </div>
          <p className="text-sm text-zinc-400 mb-6">
            粘贴你的小说或剧本文本，AI 将自动分析并拆解为专业分镜。
          </p>
          <ScriptInput
            key={initialScript ?? ""}
            onGenerate={onGenerate}
            isGenerating={isGenerating}
            initialValue={initialScript ?? undefined}
          />
        </div>
      </TabsContent>

      <TabsContent value="template" className="mt-4">
        <div className="relative rounded-xl border border-zinc-700 bg-zinc-900/60 backdrop-blur-md p-6 overflow-hidden shadow-lg">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-semibold text-white">结构化写作模板</h2>
          </div>
          <p className="text-sm text-zinc-400 mb-6">
            选择经典叙事结构，跟随模板引导完成故事大纲。
          </p>
          <NarrativeTemplateSelector
            selectedTemplate={selectedTemplate}
            onSelectTemplate={onSelectTemplate}
            templateData={templateData}
            onTemplateDataChange={onTemplateDataChange}
          />
          {selectedTemplate && (
            <Button
              variant="comic"
              className="w-full mt-6"
              onClick={onTemplateGenerate}
              disabled={isGenerating}
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? "生成中..." : "从模板生成分镜"}
            </Button>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
