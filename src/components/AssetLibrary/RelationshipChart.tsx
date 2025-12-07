import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Move, ZoomIn, ZoomOut, Save, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import charHero from "@/assets/char-hero.jpg";
import charWarrior from "@/assets/char-warrior.jpg";
import charStudent from "@/assets/char-student.jpg";
import charDetective from "@/assets/char-detective.jpg";
import charMagician from "@/assets/char-magician.jpg";
import charCyberpunk from "@/assets/char-cyberpunk.jpg";

interface CharacterPosition {
  id: string;
  name: string;
  image: string;
  x: number;
  y: number;
  scale: number;
}

const initialCharacters: CharacterPosition[] = [
  { id: "hero", name: "超级英雄", image: charHero, x: 100, y: 200, scale: 1.2 },
  { id: "warrior", name: "幻想战士", image: charWarrior, x: 250, y: 180, scale: 1.15 },
  { id: "student", name: "校园少年", image: charStudent, x: 400, y: 250, scale: 0.9 },
  { id: "detective", name: "神秘侦探", image: charDetective, x: 550, y: 190, scale: 1.1 },
  { id: "magician", name: "魔法师", image: charMagician, x: 700, y: 200, scale: 1.0 },
  { id: "cyberpunk", name: "赛博朋克", image: charCyberpunk, x: 850, y: 220, scale: 1.05 },
];

interface RelationshipChartProps {
  onBack: () => void;
}

const RelationshipChart = ({ onBack }: RelationshipChartProps) => {
  const [characters, setCharacters] = useState<CharacterPosition[]>(initialCharacters);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleMouseDown = (charId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedChar(charId);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedChar || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCharacters(prev =>
      prev.map(char =>
        char.id === selectedChar
          ? { ...char, x: Math.max(50, Math.min(rect.width - 50, x)), y: Math.max(50, Math.min(rect.height - 50, y)) }
          : char
      )
    );
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleScaleChange = (charId: string, delta: number) => {
    setCharacters(prev =>
      prev.map(char =>
        char.id === charId
          ? { ...char, scale: Math.max(0.5, Math.min(1.5, char.scale + delta)) }
          : char
      )
    );
  };

  const handleSave = () => {
    toast({
      title: "关系图已保存",
      description: "角色位置和大小关系已记录，将用于双人镜头生成",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回角色列表
        </button>
        <Button variant="comic" onClick={handleSave}>
          <Save className="w-4 h-4" />
          保存关系图
        </Button>
      </div>

      {/* Info */}
      <div className="comic-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-comic text-xl text-foreground">角色关系与身高图谱</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          拖拽角色调整位置，使用缩放按钮调整相对大小。系统会记录"男主比女主高一头"这样的关系，生成双人镜头时自动约束比例。
        </p>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative h-[500px] comic-card overflow-hidden cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid background */}
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Height reference lines */}
        <div className="absolute left-4 top-0 bottom-0 flex flex-col justify-between py-8 text-xs text-muted-foreground">
          <span>190cm</span>
          <span>170cm</span>
          <span>150cm</span>
        </div>

        {/* Characters */}
        {characters.map((char) => (
          <div
            key={char.id}
            className={cn(
              "absolute cursor-move transition-shadow",
              selectedChar === char.id && "z-10"
            )}
            style={{
              left: char.x,
              top: char.y,
              transform: `translate(-50%, -100%) scale(${char.scale})`,
            }}
            onMouseDown={(e) => handleMouseDown(char.id, e)}
          >
            {/* Character image */}
            <div
              className={cn(
                "w-20 h-28 rounded-lg overflow-hidden border-3 transition-all",
                selectedChar === char.id
                  ? "border-primary shadow-glow"
                  : "border-border hover:border-primary/50"
              )}
            >
              <img src={char.image} alt={char.name} className="w-full h-full object-cover" />
            </div>

            {/* Name label */}
            <div className="text-center mt-1">
              <span className="text-xs font-semibold text-foreground bg-background/80 px-2 py-0.5 rounded">
                {char.name}
              </span>
            </div>

            {/* Scale controls */}
            {selectedChar === char.id && (
              <div className="absolute -right-10 top-0 flex flex-col gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleScaleChange(char.id, 0.1);
                  }}
                  className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleScaleChange(char.id, -0.1);
                  }}
                  className="w-6 h-6 rounded bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Move className="w-3 h-3" /> 拖拽移动
          </span>
          <span className="flex items-center gap-1">
            <ZoomIn className="w-3 h-3" /> 点击后调整大小
          </span>
        </div>
      </div>
    </div>
  );
};

export default RelationshipChart;
