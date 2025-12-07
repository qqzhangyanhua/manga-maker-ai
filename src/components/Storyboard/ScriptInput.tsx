import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScriptInputProps {
  onGenerate: (script: string) => void;
  isGenerating: boolean;
}

const exampleScripts = [
  {
    title: "武侠场景",
    content: `夜色如墨，月光洒落在破败的客栈前。一个白衣剑客静静地站在门口，手握长剑，眼神冰冷地注视着前方。

"你终于来了。"他轻声说道。

黑衣人从阴影中走出，脸上带着冷笑："等了十年，今夜了结。"

两人同时拔剑，剑光划破夜空，金铁交鸣声响彻山谷。白衣剑客凌空跃起，剑势如虹，直取对方咽喉。`,
  },
  {
    title: "校园日常",
    content: `樱花飘落的季节，教室里阳光正好。

小美趴在桌上发呆，望着窗外的操场，思绪飘到了远方。

"喂，在想什么呢？"同桌小明戳了戳她的胳膊。

"没什么..."小美转过头，脸微微泛红，"就是...毕业以后，我们还能经常见面吗？"

小明愣了一下，然后露出温暖的笑容："当然啊，我们是永远的好朋友。"`,
  },
  {
    title: "科幻冒险",
    content: `2157年，火星殖民地。

警报声刺耳地响起，红色的灯光在走廊里闪烁。

队长艾琳看着屏幕上的数据，眉头紧锁："能量护盾只剩30%，我们必须做出选择。"

"让我去吧。"机械战士Alpha-7站了出来，金属外壳上反射着警示灯的红光。

艾琳沉默了几秒，最终点了点头："记住，你要活着回来。"`,
  },
];

const ScriptInput = ({ onGenerate, isGenerating }: ScriptInputProps) => {
  const [script, setScript] = useState("");
  const [selectedExample, setSelectedExample] = useState<number | null>(null);

  const handleExampleClick = (index: number) => {
    setSelectedExample(index);
    setScript(exampleScripts[index].content);
  };

  const handleGenerate = () => {
    if (script.trim()) {
      onGenerate(script);
    }
  };

  return (
    <div className="space-y-4">
      {/* Example Scripts */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">选择示例剧本：</p>
        <div className="flex flex-wrap gap-2">
          {exampleScripts.map((example, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(index)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                "border-2",
                selectedExample === index
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {example.title}
            </button>
          ))}
        </div>
      </div>

      {/* Text Input */}
      <div className="relative">
        <textarea
          value={script}
          onChange={(e) => {
            setScript(e.target.value);
            setSelectedExample(null);
          }}
          placeholder="在这里粘贴你的小说或剧本文本...&#10;&#10;AI 将自动分析角色、动作、对白，并拆分成漫画分镜。"
          className={cn(
            "w-full h-64 p-4 rounded-lg bg-background border-2 border-border",
            "text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
            "resize-none transition-all duration-200",
            "font-comic-body text-base leading-relaxed"
          )}
        />
        <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
          {script.length} 字符
        </div>
      </div>

      {/* Generate Button */}
      <Button
        variant="comic"
        size="lg"
        className="w-full"
        onClick={handleGenerate}
        disabled={!script.trim() || isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            AI 正在分析剧本...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            生成分镜剧本
          </>
        )}
      </Button>
    </div>
  );
};

export default ScriptInput;
