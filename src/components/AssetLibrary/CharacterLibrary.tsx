import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Eye, Loader2, Trash2, Filter, MoreHorizontal, User } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import CharacterDetailView from "./CharacterDetailView";
import RelationshipChart from "./RelationshipChart";
import CreateCharacterDialog from "./CreateCharacterDialog";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";

export interface ComicStyle {
  id: string;
  style_key: string;
  name_zh: string;
  name_en: string;
  image_url: string;
  tag_color: string;
  description: string | null;
  prompt_prefix: string | null;
  sort_order: number;
  usage_count: number;
}

export interface CharacterAsset {
  id: string;
  name: string;
  description: string | null;
  base_image_url: string | null;
  tags: string[];
  training_status: "pending" | "training" | "ready" | "failed";
  usage_count: number;
  comic_style?: ComicStyle | null;
  views?: Array<{ id: string; view_type: string; image_url: string }>;
  expressions?: Array<{ id: string; expression_type: string; image_url: string }>;
  outfits?: Array<{ id: string; outfit_name: string; outfit_type: string; image_url: string | null }>;
}

type ViewMode = "list" | "detail" | "relationship";

const CharacterLibrary = () => {
  const [characters, setCharacters] = useState<CharacterAsset[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterAsset | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<CharacterAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Style filtering states
  const [styles, setStyles] = useState<ComicStyle[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [stylesLoading, setStylesLoading] = useState(false);

  // Fetch comic styles
  useEffect(() => {
    const fetchStyles = async () => {
      setStylesLoading(true);
      try {
        const response = await fetch("/api/comic-styles");
        if (response.ok) {
          const data = await response.json();
          setStyles(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching comic styles:", error);
      } finally {
        setStylesLoading(false);
      }
    };

    fetchStyles();
  }, []);

  // Fetch characters from API
  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (selectedStyleId) {
          params.append("style_id", selectedStyleId);
        }
        const url = `/api/character${params.toString() ? `?${params.toString()}` : ""}`;
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          setCharacters(data.characters);
        }
      } catch (error) {
        console.error("Error fetching characters:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharacters();
  }, [selectedStyleId]);

  const handleCreateNew = async (character: CharacterAsset) => {
    setCharacters((prev) => {
      const filtered = prev.filter((c) => c.id !== character.id);
      return [character, ...filtered];
    });
  };

  const handleViewCharacter = (character: CharacterAsset) => {
    setSelectedCharacter(character);
    setViewMode("detail");
  };

  const handleOpenRelationshipChart = () => {
    setViewMode("relationship");
  };

  const handleDeleteClick = (character: CharacterAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    setCharacterToDelete(character);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!characterToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/character/${characterToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCharacters((prev) => prev.filter((c) => c.id !== characterToDelete.id));
        toast({
          title: "删除成功",
          description: `${characterToDelete.name} 已从角色库中移除`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || "删除失败");
      }
    } catch (error) {
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setCharacterToDelete(null);
    }
  };

  const getStatusBadge = (status: CharacterAsset["training_status"]) => {
    const baseClasses = "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-lg";
    switch (status) {
      case "ready":
        return <span className={cn(baseClasses, "bg-green-500/20 text-green-400 border border-green-500/30")}>Ready</span>;
      case "training":
        return <span className={cn(baseClasses, "bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse")}>Training</span>;
      case "failed":
        return <span className={cn(baseClasses, "bg-red-500/20 text-red-400 border border-red-500/30")}>Failed</span>;
      default:
        return <span className={cn(baseClasses, "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30")}>Draft</span>;
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
      
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Actions & Filters */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none mask-fade-right">
              <Button
                variant={!selectedStyleId ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStyleId(null)}
                className={cn(
                  "rounded-full transition-all border-zinc-700/50",
                  !selectedStyleId ? "bg-orange-500 hover:bg-orange-600 text-white border-transparent" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
              >
                全部
              </Button>
              {styles.map((style) => (
                <Button
                  key={style.id}
                  variant={selectedStyleId === style.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStyleId(style.id)}
                  className={cn(
                    "rounded-full transition-all border-zinc-700/50 flex items-center gap-2",
                    selectedStyleId === style.id 
                      ? "bg-orange-500 hover:bg-orange-600 text-white border-transparent" 
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  )}
                >
                  {style.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={style.image_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                  )}
                  {style.name_zh}
                </Button>
              ))}
            </div>

            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleOpenRelationshipChart} className="bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white">
                <Eye className="w-4 h-4 mr-2" />
                关系图谱
              </Button>
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)} className="bg-white text-black hover:bg-zinc-200">
                <Plus className="w-4 h-4 mr-2" />
                新建角色
              </Button>
            </div>
          </div>
        </div>

        {/* Character Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {/* Create New Card */}
          <GlassCard 
            className="group relative flex flex-col items-center justify-center gap-4 min-h-[320px] cursor-pointer border-dashed border-2 border-zinc-800 hover:border-orange-500/50 bg-zinc-900/20 hover:bg-zinc-900/40 transition-all duration-300"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center group-hover:bg-orange-500/20 group-hover:text-orange-500 transition-colors">
              <Plus className="w-8 h-8 text-zinc-500 group-hover:text-orange-500 transition-colors" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-zinc-300 group-hover:text-white transition-colors">新建角色</p>
              <p className="text-xs text-zinc-500 mt-1">训练 LoRA 模型</p>
            </div>
          </GlassCard>

          {isLoading ? (
            // Loading Skeletons
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-zinc-900/50 border border-zinc-800 h-[320px] p-3 space-y-3">
                <Skeleton className="w-full aspect-[3/4] rounded-lg bg-zinc-800" />
                <Skeleton className="h-4 w-2/3 bg-zinc-800" />
                <Skeleton className="h-3 w-1/2 bg-zinc-800" />
              </div>
            ))
          ) : (
            characters.map((character) => (
              <GlassCard
                key={character.id}
                className="group relative p-0 overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-500"
                onClick={() => handleViewCharacter(character)}
              >
                {/* Image Area */}
                <div className="aspect-[3/4] relative overflow-hidden bg-zinc-900">
                  {character.base_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={character.base_image_url}
                      alt={character.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 bg-zinc-900">
                      <User className="w-16 h-16 opacity-20" />
                    </div>
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
                    {character.comic_style ? (
                      <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/40 backdrop-blur-md text-zinc-300 border border-white/10">
                        {character.comic_style.name_en}
                      </span>
                    ) : <span />}
                    {getStatusBadge(character.training_status)}
                  </div>

                  {/* Quick Actions (Hover) */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-20">
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/10" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32 bg-zinc-900 border-zinc-800 text-zinc-300">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewCharacter(character); }}>
                          <Eye className="w-4 h-4 mr-2" /> 详情
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); /* handle use */ }}>
                          <Sparkles className="w-4 h-4 mr-2" /> 使用
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                          onClick={(e) => handleDeleteClick(character, e)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> 删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Content Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 transform transition-transform duration-300">
                    <h3 className="text-lg font-bold text-white mb-1 line-clamp-1 group-hover:text-orange-400 transition-colors">
                      {character.name}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 mb-3 h-[2.5em]">
                      {character.description || "暂无描述..."}
                    </p>
                    
                    {/* Stats Row */}
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-medium border-t border-white/10 pt-3 mt-1">
                      <span>{character.views?.length || 0} 视角</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span>{character.expressions?.length || 0} 表情</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span>{character.outfits?.length || 0} 服装</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">确认删除角色?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              您确定要删除角色 <span className="text-white font-medium">"{characterToDelete?.name}"</span> 吗？
              此操作将永久删除该角色的所有关联数据（三视图、表情、模型等），且无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CharacterLibrary;
