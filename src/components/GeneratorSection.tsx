import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Wand2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface GeneratorSectionProps {
  selectedStyle: string | null;
  selectedCharacter: string | null;
}

const GeneratorSection = ({ selectedStyle, selectedCharacter }: GeneratorSectionProps) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (!selectedStyle || !selectedCharacter) return;
    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => setIsGenerating(false), 3000);
  };

  const isReady = selectedStyle && selectedCharacter && prompt.trim();

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="font-comic text-4xl md:text-5xl comic-title mb-4">
            创作你的漫画
          </h2>
          <p className="text-muted-foreground text-lg">
            描述你想要的场景，AI将为你生成独特的漫画作品
          </p>
        </div>

        {/* Generator Card */}
        <div className="comic-card p-6 md:p-8">
          {/* Status Pills */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className={cn(
              "px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all",
              selectedStyle 
                ? "bg-comic-green/20 text-comic-green border border-comic-green/30" 
                : "bg-muted text-muted-foreground"
            )}>
              {selectedStyle ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  风格: {selectedStyle}
                </>
              ) : (
                "请选择风格"
              )}
            </div>
            <div className={cn(
              "px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all",
              selectedCharacter 
                ? "bg-comic-blue/20 text-comic-blue border border-comic-blue/30" 
                : "bg-muted text-muted-foreground"
            )}>
              {selectedCharacter ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  角色: {selectedCharacter}
                </>
              ) : (
                "请选择角色"
              )}
            </div>
          </div>

          {/* Prompt Input */}
          <div className="relative mb-6">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述你想要创作的漫画场景... 例如：一位英雄在城市屋顶上眺望夜景，月光照亮了他的披风"
              className={cn(
                "w-full h-32 p-4 rounded-lg bg-background border-2 border-border",
                "text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                "resize-none transition-all duration-200"
              )}
            />
            <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
              {prompt.length} / 500
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="comic"
              size="xl"
              className="flex-1"
              disabled={!isReady || isGenerating}
              onClick={handleGenerate}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  正在生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  生成漫画
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="sm:w-auto"
              onClick={() => setPrompt("")}
            >
              <RefreshCw className="w-5 h-5" />
              清空
            </Button>
          </div>

          {/* Tips */}
          <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <Wand2 className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">创作小贴士</p>
                <p className="text-sm text-muted-foreground">
                  尝试描述具体的场景、动作和情感，比如"勇敢的战士面对巨龙，眼神坚定"比简单的"战士和龙"效果更好！
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Area (Placeholder) */}
        {isGenerating && (
          <div className="mt-8 comic-card p-8 flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="font-comic text-2xl text-foreground mb-2">AI 正在创作中...</p>
              <p className="text-muted-foreground">请稍候，你的专属漫画即将呈现</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default GeneratorSection;
