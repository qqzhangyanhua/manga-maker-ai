import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import CharacterDetailView from "./CharacterDetailView";
import RelationshipChart from "./RelationshipChart";
import CreateCharacterDialog from "./CreateCharacterDialog";

interface CharacterAsset {
  id: string;
  name: string;
  description: string | null;
  base_image_url: string | null;
  tags: string[];
  training_status: "pending" | "training" | "ready" | "failed";
  usage_count: number;
  views?: Array<{ view_type: string; image_url: string }>;
  expressions?: Array<{ expression_type: string; image_url: string }>;
  outfits?: Array<{ outfit_name: string; outfit_type: string; image_url: string | null }>;
}

type ViewMode = "list" | "detail" | "relationship";

const CharacterLibrary = () => {
  const [characters, setCharacters] = useState<CharacterAsset[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterAsset | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch characters from API
  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await fetch("/api/character");
        if (response.ok) {
          const data = await response.json();
          setCharacters(data.characters);
        } else {
          console.error("Failed to fetch characters");
        }
      } catch (error) {
        console.error("Error fetching characters:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharacters();
  }, []);

  const handleCreateNew = async (data: { name: string; description: string }) => {
    try {
      const response = await fetch("/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          tags: [],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCharacters((prev) => [result.character, ...prev]);
        toast({
          title: "角色创建成功",
          description: `${data.name} 已添加到角色库`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "创建失败",
          description: error.error || "创建角色失败",
          variant: "destructive",
        });
        throw new Error(error.error);
      }
    } catch (error) {
      toast({
        title: "创建失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleViewCharacter = (character: CharacterAsset) => {
    setSelectedCharacter(character);
    setViewMode("detail");
  };

  const handleOpenRelationshipChart = () => {
    setViewMode("relationship");
  };

  const getStatusBadge = (status: CharacterAsset["training_status"]) => {
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
      case "failed":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-comic-red/20 text-comic-red border border-comic-red/30">
            失败
          </span>
        );
    }
  };

  // Detail View
  if (viewMode === "detail" && selectedCharacter) {
    return (
      <CharacterDetailView
        character={selectedCharacter}
        onBack={() => {
          setViewMode("list");
          setSelectedCharacter(null);
        }}
        onUpdate={(updated) => {
          setCharacters((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          );
        }}
      />
    );
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
    <>
      <CreateCharacterDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateNew}
      />
      
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
            <Button variant="comic" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              创建新角色
            </Button>
          </div>
        </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

        {/* Empty State */}
        {!isLoading && characters.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">还没有角色，创建第一个"数字演员"吧！</p>
            <Button variant="comic" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              创建新角色
            </Button>
          </div>
        )}

      {/* Character Grid */}
      {!isLoading && characters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((character) => (
            <div
              key={character.id}
              className="comic-card group cursor-pointer transition-all duration-300 hover:ring-2 hover:ring-primary"
              onClick={() => handleViewCharacter(character)}
            >
              {/* Image */}
              <div className="aspect-square relative overflow-hidden rounded-t-lg">
                {character.base_image_url ? (
                  <img
                    src={character.base_image_url}
                    alt={character.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-6xl">👤</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  {getStatusBadge(character.training_status)}
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
                    <p className="text-sm text-muted-foreground">
                      {character.description || "暂无描述"}
                    </p>
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
                    📷 三视图 {character.views?.length || 0}/3
                  </span>
                  <span className="flex items-center gap-1">
                    😊 表情 {character.expressions?.length || 0}/9
                  </span>
                  <span className="flex items-center gap-1">
                    👕 服装 {character.outfits?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Card */}
          <button
            onClick={() => setIsCreateDialogOpen(true)}
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
      )}
      </div>
    </>
  );
};

export default CharacterLibrary;
