import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import CharacterDetailView from "./CharacterDetailView";
import RelationshipChart from "./RelationshipChart";

interface CharacterAsset {
  id: string;
  name: string;
  description: string;
  image: string;
  tags: string[];
  trainingStatus: "pending" | "training" | "ready";
  usageCount: number;
}

const defaultCharacters: CharacterAsset[] = [
  {
    id: "hero",
    name: "超级英雄",
    description: "正义凛然，守护城市的勇者",
    image: "/assets/char-hero.jpg",
    tags: ["英雄", "力量", "披风"],
    trainingStatus: "ready",
    usageCount: 42,
  },
  {
    id: "warrior",
    name: "幻想战士",
    description: "手持神剑，征战异世界",
    image: "/assets/char-warrior.jpg",
    tags: ["战士", "盔甲", "剑"],
    trainingStatus: "ready",
    usageCount: 38,
  },
  {
    id: "student",
    name: "校园少年",
    description: "青春洋溢，追逐梦想",
    image: "/assets/char-student.jpg",
    tags: ["校园", "青春", "制服"],
    trainingStatus: "ready",
    usageCount: 56,
  },
  {
    id: "detective",
    name: "神秘侦探",
    description: "洞察一切，揭开真相",
    image: "/assets/char-detective.jpg",
    tags: ["侦探", "神秘", "帽子"],
    trainingStatus: "training",
    usageCount: 21,
  },
  {
    id: "magician",
    name: "魔法师",
    description: "掌控元素，操纵魔法",
    image: "/assets/char-magician.jpg",
    tags: ["魔法", "法杖", "斗篷"],
    trainingStatus: "ready",
    usageCount: 33,
  },
  {
    id: "cyberpunk",
    name: "赛博朋克",
    description: "未来都市的科技战士",
    image: "/assets/char-cyberpunk.jpg",
    tags: ["科幻", "赛博", "霓虹"],
    trainingStatus: "ready",
    usageCount: 29,
  },
];

type ViewMode = "list" | "detail" | "relationship";

const CharacterLibrary = () => {
  const [characters] = useState<CharacterAsset[]>(defaultCharacters);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const { toast } = useToast();

  const handleCreateNew = () => {
    toast({
      title: "创建新角色",
      description: "角色创建功能需要连接 Lovable Cloud",
    });
  };

  const handleViewCharacter = (character: CharacterAsset) => {
    setSelectedCharacter(character.id);
    setViewMode("detail");
  };

  const handleOpenRelationshipChart = () => {
    setViewMode("relationship");
  };

  const getStatusBadge = (status: CharacterAsset["trainingStatus"]) => {
    switch (status) {
      case "ready":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-comic-green/20 text-comic-green border border-comic-green/30">
            可用
          </span>
        );
      case "training":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-comic-yellow/20 text-comic-yellow border border-comic-yellow/30 animate-pulse">
            训练中
          </span>
        );
      case "pending":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
            待训练
          </span>
        );
    }
  };

  // Detail View
  if (viewMode === "detail" && selectedCharacter) {
    const character = characters.find((c) => c.id === selectedCharacter);
    if (character) {
      return (
        <CharacterDetailView
          character={character}
          onBack={() => {
            setViewMode("list");
            setSelectedCharacter(null);
          }}
        />
      );
    }
  }

  // Relationship Chart View
  if (viewMode === "relationship") {
    return (
      <RelationshipChart
        onBack={() => setViewMode("list")}
      />
    );
  }

  // List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-comic text-2xl text-foreground">角色一致性引擎</h2>
          <p className="text-muted-foreground">
            打造"数字演员"，保持角色在不同分镜中的一致性
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenRelationshipChart}>
            <Eye className="w-4 h-4" />
            角色关系图谱
          </Button>
          <Button variant="comic" onClick={handleCreateNew}>
            <Plus className="w-4 h-4" />
            创建新角色
          </Button>
        </div>
      </div>

      {/* Character Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map((character) => (
          <div
            key={character.id}
            className="comic-card group cursor-pointer transition-all duration-300 hover:ring-2 hover:ring-primary"
            onClick={() => handleViewCharacter(character)}
          >
            {/* Image */}
            <div className="aspect-square relative overflow-hidden rounded-t-lg">
              <img
                src={character.image}
                alt={character.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              
              {/* Status Badge */}
              <div className="absolute top-3 right-3">
                {getStatusBadge(character.trainingStatus)}
              </div>

              {/* Quick Actions */}
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="comic"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewCharacter(character);
                  }}
                >
                  <Eye className="w-4 h-4" />
                  详情
                </Button>
                <Button size="sm" variant="outline">
                  <Sparkles className="w-4 h-4" />
                  使用
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-comic text-xl text-foreground">{character.name}</h3>
                  <p className="text-sm text-muted-foreground">{character.description}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-3">
                {character.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Features indicator */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  📷 三视图
                </span>
                <span className="flex items-center gap-1">
                  😊 表情矩阵
                </span>
                <span className="flex items-center gap-1">
                  👕 服装
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Add New Card */}
        <button
          onClick={handleCreateNew}
          className="comic-card min-h-[300px] flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border hover:border-primary transition-colors"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">创建新角色</p>
            <p className="text-sm text-muted-foreground">上传图片训练 LoRA</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default CharacterLibrary;
