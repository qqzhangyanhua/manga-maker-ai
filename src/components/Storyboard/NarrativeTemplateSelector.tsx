import { useState } from "react";
import { cn } from "@/lib/utils";
import { BookOpen, Sword, Laugh, Sparkles } from "lucide-react";

export interface NarrativeTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  structure: {
    id: string;
    label: string;
    description: string;
    placeholder: string;
  }[];
}

export const narrativeTemplates: NarrativeTemplate[] = [
  {
    id: "kishotenketsu",
    name: "起承转合",
    nameEn: "Kishōtenketsu",
    description: "经典日式叙事结构，适合日漫风格",
    icon: <BookOpen className="w-5 h-5" />,
    color: "bg-comic-pink/20 border-comic-pink text-comic-pink",
    structure: [
      { id: "ki", label: "起 (Ki)", description: "介绍背景和角色", placeholder: "例：宁静的校园，樱花盛开的季节..." },
      { id: "sho", label: "承 (Shō)", description: "故事发展展开", placeholder: "例：主角收到神秘的邀请函..." },
      { id: "ten", label: "转 (Ten)", description: "意外转折发生", placeholder: "例：原来一切都是陷阱，敌人现身..." },
      { id: "ketsu", label: "合 (Ketsu)", description: "结局与收尾", placeholder: "例：主角觉醒新力量，战胜敌人..." },
    ],
  },
  {
    id: "hero-journey",
    name: "英雄之旅",
    nameEn: "Hero's Journey",
    description: "经典美式叙事结构，适合热血漫",
    icon: <Sword className="w-5 h-5" />,
    color: "bg-comic-red/20 border-comic-red text-comic-red",
    structure: [
      { id: "ordinary", label: "平凡世界", description: "英雄的日常生活", placeholder: "例：小村庄里的普通少年..." },
      { id: "call", label: "冒险召唤", description: "打破平静的事件", placeholder: "例：村庄被袭击，获得神秘力量..." },
      { id: "threshold", label: "跨越门槛", description: "踏上冒险之路", placeholder: "例：离开家乡，踏上复仇之路..." },
      { id: "trials", label: "试炼之路", description: "遭遇挑战与成长", placeholder: "例：遇到导师、结交伙伴、战胜敌人..." },
      { id: "ordeal", label: "核心考验", description: "最大的危机", placeholder: "例：面对最强敌人，濒临死亡..." },
      { id: "reward", label: "获得奖赏", description: "战胜考验后的收获", placeholder: "例：解锁终极形态，获得认可..." },
    ],
  },
  {
    id: "yonkoma",
    name: "四格笑话",
    nameEn: "4-Koma Comedy",
    description: "经典四格漫画结构，适合轻松搞笑",
    icon: <Laugh className="w-5 h-5" />,
    color: "bg-comic-yellow/20 border-comic-yellow text-comic-yellow",
    structure: [
      { id: "setup1", label: "铺垫一", description: "建立场景和人物", placeholder: "例：主角在认真学习..." },
      { id: "setup2", label: "铺垫二", description: "继续发展情节", placeholder: "例：朋友过来搭话..." },
      { id: "conflict", label: "冲突", description: "意外情况发生", placeholder: "例：发现书拿反了..." },
      { id: "punchline", label: "梗 (Punchline)", description: "笑点爆发", placeholder: "例：原来他一直在假装用功！" },
    ],
  },
];

interface NarrativeTemplateSelectorProps {
  selectedTemplate: string | null;
  onSelectTemplate: (templateId: string) => void;
  templateData: Record<string, string>;
  onTemplateDataChange: (data: Record<string, string>) => void;
}

const NarrativeTemplateSelector = ({
  selectedTemplate,
  onSelectTemplate,
  templateData,
  onTemplateDataChange,
}: NarrativeTemplateSelectorProps) => {
  const currentTemplate = narrativeTemplates.find((t) => t.id === selectedTemplate);

  const handleInputChange = (structureId: string, value: string) => {
    onTemplateDataChange({
      ...templateData,
      [structureId]: value,
    });
  };

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">选择叙事结构模板</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {narrativeTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.id)}
              className={cn(
                "p-4 rounded-lg border-2 text-left transition-all",
                selectedTemplate === template.id
                  ? `${template.color} border-current`
                  : "border-border hover:border-primary/50 bg-card"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                {template.icon}
                <span className="font-comic text-lg">{template.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{template.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Structure Form */}
      {currentTemplate && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">
              填写 {currentTemplate.name} 结构
            </h4>
          </div>
          <div className="space-y-3">
            {currentTemplate.structure.map((step, index) => (
              <div key={step.id} className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    currentTemplate.color
                  )}>
                    {index + 1}
                  </span>
                  <span className="font-semibold text-foreground">{step.label}</span>
                  <span className="text-xs text-muted-foreground">— {step.description}</span>
                </div>
                <textarea
                  value={templateData[step.id] || ""}
                  onChange={(e) => handleInputChange(step.id, e.target.value)}
                  placeholder={step.placeholder}
                  className={cn(
                    "w-full p-3 rounded-lg bg-background border-2 border-border",
                    "text-foreground placeholder:text-muted-foreground text-sm",
                    "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                    "resize-none h-20"
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NarrativeTemplateSelector;
