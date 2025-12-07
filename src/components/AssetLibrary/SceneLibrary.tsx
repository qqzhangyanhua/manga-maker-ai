import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, MapPin, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface SceneAsset {
  id: string;
  name: string;
  description: string;
  image: string;
  location: string;
  timeOfDay: string;
  usageCount: number;
}

const defaultScenes: SceneAsset[] = [
  {
    id: "city-night",
    name: "都市夜景",
    description: "霓虹闪烁的现代都市夜景，高楼林立",
    image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&h=400&fit=crop",
    location: "都市",
    timeOfDay: "夜晚",
    usageCount: 34,
  },
  {
    id: "fantasy-forest",
    name: "奇幻森林",
    description: "神秘的魔法森林，古树参天，萤火虫飞舞",
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&h=400&fit=crop",
    location: "森林",
    timeOfDay: "黄昏",
    usageCount: 28,
  },
  {
    id: "school",
    name: "校园教室",
    description: "阳光洒落的日式校园教室",
    image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&h=400&fit=crop",
    location: "学校",
    timeOfDay: "白天",
    usageCount: 45,
  },
  {
    id: "space-station",
    name: "空间站",
    description: "未来科幻风格的太空站内部",
    image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&h=400&fit=crop",
    location: "太空",
    timeOfDay: "无",
    usageCount: 19,
  },
  {
    id: "ancient-temple",
    name: "古代神殿",
    description: "神秘的东方古代神殿，石柱环绕",
    image: "https://images.unsplash.com/photo-1548013146-72479768bada?w=600&h=400&fit=crop",
    location: "神殿",
    timeOfDay: "黎明",
    usageCount: 23,
  },
  {
    id: "cafe",
    name: "温馨咖啡厅",
    description: "现代风格的咖啡厅，温暖的灯光",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop",
    location: "室内",
    timeOfDay: "下午",
    usageCount: 31,
  },
];

const SceneLibrary = () => {
  const [scenes] = useState<SceneAsset[]>(defaultScenes);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCreateNew = () => {
    toast({
      title: "创建新场景",
      description: "场景创建功能需要连接 Lovable Cloud",
    });
  };

  const handleUseScene = (scene: SceneAsset) => {
    toast({
      title: `已选择 ${scene.name}`,
      description: "场景已添加到当前创作中",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-comic text-2xl text-foreground">场景记忆库</h2>
          <p className="text-muted-foreground">
            保存场景设定，保持故事中场景的一致性
          </p>
        </div>
        <Button variant="comic" onClick={handleCreateNew}>
          <Plus className="w-4 h-4" />
          创建新场景
        </Button>
      </div>

      {/* Scene Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenes.map((scene) => (
          <div
            key={scene.id}
            className={cn(
              "comic-card group cursor-pointer transition-all duration-300",
              selectedScene === scene.id && "ring-2 ring-primary"
            )}
            onClick={() => setSelectedScene(scene.id)}
          >
            {/* Image */}
            <div className="aspect-video relative overflow-hidden rounded-t-lg">
              <img
                src={scene.image}
                alt={scene.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

              {/* Location & Time Tags */}
              <div className="absolute top-3 left-3 flex gap-2">
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-background/80 text-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {scene.location}
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-background/80 text-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {scene.timeOfDay}
                </span>
              </div>

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="comic"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUseScene(scene);
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  使用
                </Button>
                <Button size="sm" variant="outline">
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-comic text-xl text-foreground mb-1">{scene.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{scene.description}</p>

              {/* Stats */}
              <div className="text-xs text-muted-foreground">
                使用次数: {scene.usageCount}
              </div>
            </div>
          </div>
        ))}

        {/* Add New Card */}
        <button
          onClick={handleCreateNew}
          className="comic-card min-h-[200px] flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border hover:border-primary transition-colors"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">创建新场景</p>
            <p className="text-sm text-muted-foreground">保存场景设定</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default SceneLibrary;
