/**
 * 结构化结果展示组件
 * 根据不同阶段和数据类型，以可视化方式展示生成结果
 * 支持编辑模式和只读模式
 */
"use client";

import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Edit3,
  Eye,
  User,
  Globe,
  BookOpen,
  Target,
  Zap,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Users,
  MapPin,
  Swords,
  Heart,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StructuredResultViewProps {
  /** 原始结果文本 */
  result: string;
  /** 解析后的 JSON 对象 */
  parsedResult: Record<string, unknown> | null;
  /** 当前阶段 */
  phase: string;
  /** 是否允许编辑 */
  editable?: boolean;
  /** 结果变更回调 */
  onResultChange?: (newResult: string) => void;
}

// 尝试解析 JSON，支持从 markdown 代码块中提取
function tryParseJSON(content: string): Record<string, unknown> | null {
  if (!content) return null;

  // 直接解析
  try {
    return JSON.parse(content);
  } catch {
    // 忽略
  }

  // 尝试提取 JSON 代码块
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // 忽略
    }
  }

  return null;
}

// 通用的可折叠卡片组件
function CollapsibleCard({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  className,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-lg border border-zinc-700 bg-zinc-800/30 overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-zinc-700/30 transition-colors"
      >
        {Icon && <Icon className="h-4 w-4 text-purple-400" />}
        <span className="text-sm font-medium text-zinc-200 flex-1">{title}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-zinc-500" />
        )}
      </button>
      {isOpen && <div className="p-3 pt-0 border-t border-zinc-700/50">{children}</div>}
    </div>
  );
}

// 角色卡片组件
function CharacterCard({
  character,
  type = "protagonist",
}: {
  character: Record<string, unknown>;
  type?: "protagonist" | "supporting";
}) {
  const name = (character.name || character.姓名 || "未命名") as string;
  const role = (character.role || character.角色定位 || character.身份 || "") as string;
  const personality = (character.personality || character.性格 || character.性格特点 || "") as string;
  const background = (character.background || character.背景 || character.背景故事 || "") as string;
  const abilities = (character.abilities || character.能力 || character.特殊能力 || []) as string[];
  const motivation = (character.motivation || character.动机 || character.目标 || "") as string;

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-3",
      type === "protagonist" 
        ? "border-purple-500/30 bg-purple-500/5" 
        : "border-zinc-700 bg-zinc-800/30"
    )}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <User className={cn(
              "h-4 w-4",
              type === "protagonist" ? "text-purple-400" : "text-zinc-400"
            )} />
            <span className="font-medium text-white">{name}</span>
          </div>
          {role && (
            <Badge variant="outline" className="mt-1 text-xs bg-zinc-800 text-zinc-400 border-zinc-600">
              {role}
            </Badge>
          )}
        </div>
        {type === "protagonist" && (
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">主角</Badge>
        )}
      </div>

      {personality && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Heart className="h-3 w-3" />
            <span>性格特点</span>
          </div>
          <p className="text-sm text-zinc-300">{personality}</p>
        </div>
      )}

      {background && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <BookOpen className="h-3 w-3" />
            <span>背景故事</span>
          </div>
          <p className="text-sm text-zinc-300 line-clamp-3">{background}</p>
        </div>
      )}

      {motivation && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Target className="h-3 w-3" />
            <span>动机/目标</span>
          </div>
          <p className="text-sm text-zinc-300">{motivation}</p>
        </div>
      )}

      {abilities && abilities.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Zap className="h-3 w-3" />
            <span>能力</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(Array.isArray(abilities) ? abilities : [abilities]).map((ability, i) => (
              <Badge key={i} variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
                {String(ability)}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 世界观展示组件
function WorldSettingView({ data }: { data: Record<string, unknown> }) {
  const worldName = (data.world_name || data.worldName || data.世界名称 || "") as string;
  const era = (data.era || data.时代背景 || data.时代 || "") as string;
  const geography = (data.geography || data.地理环境 || data.地理 || "") as string;
  const powerSystem = (data.power_system || data.powerSystem || data.力量体系 || "") as string;
  const factions = (data.factions || data.势力 || data.阵营 || []) as unknown[];
  const rules = (data.rules || data.世界规则 || data.核心规则 || []) as unknown[];
  const description = (data.description || data.描述 || data.世界观描述 || "") as string;

  return (
    <div className="space-y-4">
      {worldName && (
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          <Globe className="h-5 w-5 text-purple-400" />
          {worldName}
        </div>
      )}

      {description && (
        <p className="text-sm text-zinc-300 leading-relaxed">{description}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {era && (
          <div className="rounded-lg bg-zinc-800/50 p-3">
            <div className="text-xs text-zinc-500 mb-1">时代背景</div>
            <div className="text-sm text-zinc-200">{era}</div>
          </div>
        )}

        {geography && (
          <div className="rounded-lg bg-zinc-800/50 p-3">
            <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
              <MapPin className="h-3 w-3" />
              <span>地理环境</span>
            </div>
            <div className="text-sm text-zinc-200">{geography}</div>
          </div>
        )}

        {powerSystem && (
          <div className="rounded-lg bg-zinc-800/50 p-3">
            <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1">
              <Swords className="h-3 w-3" />
              <span>力量体系</span>
            </div>
            <div className="text-sm text-zinc-200">{powerSystem}</div>
          </div>
        )}
      </div>

      {factions && factions.length > 0 && (
        <CollapsibleCard title="势力/阵营" icon={Users} defaultOpen={false}>
          <div className="space-y-2">
            {factions.map((faction, i) => (
              <div key={i} className="text-sm text-zinc-300">
                {typeof faction === "object" && faction !== null ? (
                  <div className="p-2 bg-zinc-800/50 rounded">
                    <div className="font-medium text-zinc-200">
                      {String((faction as Record<string, unknown>).name || (faction as Record<string, unknown>).名称 || `势力 ${i + 1}`)}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      {String((faction as Record<string, unknown>).description || (faction as Record<string, unknown>).描述 || "")}
                    </div>
                  </div>
                ) : (
                  <span>• {String(faction)}</span>
                )}
              </div>
            ))}
          </div>
        </CollapsibleCard>
      )}

      {rules && rules.length > 0 && (
        <CollapsibleCard title="世界规则" icon={Brain} defaultOpen={false}>
          <ul className="space-y-1">
            {rules.map((rule, i) => (
              <li key={i} className="text-sm text-zinc-300 flex gap-2">
                <span className="text-purple-400">•</span>
                <span>{String(rule)}</span>
              </li>
            ))}
          </ul>
        </CollapsibleCard>
      )}
    </div>
  );
}

// 大纲/章节展示组件
function OutlineView({ data }: { data: Record<string, unknown> }) {
  const chapters = (data.chapters || data.chapterPlans || data.章节 || data.章节大纲 || []) as unknown[];
  const overview = (data.overview || data.outlineOverview || data.概述 || data.故事概述 || "") as string;
  const mainPlot = (data.main_plot || data.mainPlot || data.主线剧情 || "") as string;
  const subPlots = (data.sub_plots || data.subPlots || data.支线剧情 || []) as unknown[];

  return (
    <div className="space-y-4">
      {overview && (
        <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-300 mb-2">
            <Sparkles className="h-4 w-4" />
            故事概述
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">{overview}</p>
        </div>
      )}

      {mainPlot && (
        <CollapsibleCard title="主线剧情" icon={Target}>
          <p className="text-sm text-zinc-300 leading-relaxed">{mainPlot}</p>
        </CollapsibleCard>
      )}

      {subPlots && subPlots.length > 0 && (
        <CollapsibleCard title="支线剧情" defaultOpen={false}>
          <ul className="space-y-2">
            {subPlots.map((plot, i) => (
              <li key={i} className="text-sm text-zinc-300 p-2 bg-zinc-800/50 rounded">
                {typeof plot === "object" && plot !== null ? (
                  <>
                    <div className="font-medium text-zinc-200">
                      {String((plot as Record<string, unknown>).title || (plot as Record<string, unknown>).标题 || `支线 ${i + 1}`)}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      {String((plot as Record<string, unknown>).description || (plot as Record<string, unknown>).描述 || "")}
                    </div>
                  </>
                ) : (
                  String(plot)
                )}
              </li>
            ))}
          </ul>
        </CollapsibleCard>
      )}

      {chapters && chapters.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <BookOpen className="h-4 w-4 text-purple-400" />
            章节规划 ({chapters.length} 章)
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {chapters.map((chapter, i) => {
              const chapterData = typeof chapter === "object" && chapter !== null 
                ? chapter as Record<string, unknown>
                : { title: String(chapter) };
              const title = (chapterData.title || chapterData.章节标题 || chapterData.标题 || `第 ${i + 1} 章`) as string;
              const summary = (chapterData.summary || chapterData.简介 || chapterData.内容概要 || "") as string;
              const coolPoints = (chapterData.cool_points || chapterData.coolPoints || chapterData.爽点 || []) as unknown[];

              return (
                <div key={i} className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="font-medium text-zinc-200 text-sm">{title}</span>
                  </div>
                  {summary && (
                    <p className="text-xs text-zinc-400 mt-2 ml-8 line-clamp-2">{summary}</p>
                  )}
                  {coolPoints && coolPoints.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 ml-8">
                      {coolPoints.slice(0, 3).map((point, j) => (
                        <Badge key={j} variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                          {String(point)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// 创意阶段展示组件
function CreativeView({ data }: { data: Record<string, unknown> }) {
  const concept = (data.concept || data.核心概念 || data.one_sentence || "") as string;
  const genre = (data.genre || data.类型 || "") as string;
  const targetAudience = (data.target_audience || data.targetAudience || data.目标读者 || "") as string;
  const sellingPoints = (data.selling_points || data.sellingPoints || data.卖点 || []) as unknown[];
  const inspirations = (data.inspirations || data.inspiration_pool || data.灵感 || []) as unknown[];
  const recommendations = (data.recommendations || data.top_recommendations || []) as unknown[];
  const marketAnalysis = (data.market_analysis || data.marketAnalysis || data.市场分析 || "") as string;

  return (
    <div className="space-y-4">
      {concept && (
        <div className="rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-300 mb-2">
            <Sparkles className="h-4 w-4" />
            核心概念
          </div>
          <p className="text-base text-white font-medium">{concept}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {genre && (
          <div className="rounded-lg bg-zinc-800/50 p-3">
            <div className="text-xs text-zinc-500 mb-1">类型</div>
            <Badge className="bg-purple-500/20 text-purple-300">{genre}</Badge>
          </div>
        )}
        {targetAudience && (
          <div className="rounded-lg bg-zinc-800/50 p-3">
            <div className="text-xs text-zinc-500 mb-1">目标读者</div>
            <div className="text-sm text-zinc-200">{targetAudience}</div>
          </div>
        )}
      </div>

      {marketAnalysis && (
        <CollapsibleCard title="市场分析" icon={Target}>
          <p className="text-sm text-zinc-300 leading-relaxed">{marketAnalysis}</p>
        </CollapsibleCard>
      )}

      {sellingPoints && sellingPoints.length > 0 && (
        <CollapsibleCard title="核心卖点" icon={Zap}>
          <div className="flex flex-wrap gap-2">
            {sellingPoints.map((point, i) => (
              <Badge key={i} className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                {String(point)}
              </Badge>
            ))}
          </div>
        </CollapsibleCard>
      )}

      {inspirations && inspirations.length > 0 && (
        <CollapsibleCard title="灵感来源" defaultOpen={false}>
          <ul className="space-y-1">
            {inspirations.map((item, i) => (
              <li key={i} className="text-sm text-zinc-300 flex gap-2">
                <span className="text-purple-400">•</span>
                <span>{typeof item === "object" ? JSON.stringify(item) : String(item)}</span>
              </li>
            ))}
          </ul>
        </CollapsibleCard>
      )}

      {recommendations && recommendations.length > 0 && (
        <CollapsibleCard title="推荐方向" defaultOpen={false}>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div key={i} className="p-2 bg-zinc-800/50 rounded text-sm text-zinc-300">
                {typeof rec === "object" && rec !== null ? (
                  <>
                    <div className="font-medium text-zinc-200">
                      {String((rec as Record<string, unknown>).title || (rec as Record<string, unknown>).标题 || `方向 ${i + 1}`)}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      {String((rec as Record<string, unknown>).reason || (rec as Record<string, unknown>).理由 || "")}
                    </div>
                  </>
                ) : (
                  String(rec)
                )}
              </div>
            ))}
          </div>
        </CollapsibleCard>
      )}
    </div>
  );
}

// 根据阶段选择合适的展示组件
function PhaseSpecificView({
  phase,
  data,
}: {
  phase: string;
  data: Record<string, unknown>;
}) {
  // 检测数据类型，智能选择展示组件
  const hasCharacters = data.protagonist || data.characters || data.主角 || data.角色;
  const hasWorldSetting = data.world_setting || data.worldSetting || data.世界观 || data.world_name;
  const hasOutline = data.chapters || data.chapterPlans || data.章节 || data.outline;
  const hasCreative = data.concept || data.核心概念 || data.selling_points || data.market_analysis;

  // 根据阶段或数据内容选择视图
  if (phase === "creative" || hasCreative) {
    return <CreativeView data={data} />;
  }

  if (phase === "setting") {
    return (
      <div className="space-y-6">
        {hasWorldSetting && <WorldSettingView data={data} />}
        {hasCharacters && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Users className="h-4 w-4 text-purple-400" />
              角色设定
            </div>
            {data.protagonist && (
              <CharacterCard 
                character={data.protagonist as Record<string, unknown>} 
                type="protagonist" 
              />
            )}
            {data.characters && Array.isArray(data.characters) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(data.characters as Record<string, unknown>[]).map((char, i) => (
                  <CharacterCard key={i} character={char} type="supporting" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (phase === "framework" || hasOutline) {
    return <OutlineView data={data} />;
  }

  // 默认：通用 JSON 展示
  return <GenericJsonView data={data} />;
}

// 通用 JSON 展示组件
function GenericJsonView({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);

  const formatValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-zinc-500 italic">空</span>;
    }
    if (typeof value === "boolean") {
      return <Badge variant="outline">{value ? "是" : "否"}</Badge>;
    }
    if (typeof value === "number") {
      return <span className="text-amber-400">{value}</span>;
    }
    if (typeof value === "string") {
      if (value.length > 200) {
        return <p className="text-sm text-zinc-300 whitespace-pre-wrap">{value}</p>;
      }
      return <span className="text-zinc-200">{value}</span>;
    }
    if (Array.isArray(value)) {
      return (
        <ul className="space-y-1 ml-2">
          {value.map((item, i) => (
            <li key={i} className="text-sm text-zinc-300 flex gap-2">
              <span className="text-purple-400">•</span>
              <span>{typeof item === "object" ? JSON.stringify(item, null, 2) : String(item)}</span>
            </li>
          ))}
        </ul>
      );
    }
    if (typeof value === "object") {
      return (
        <div className="ml-2 pl-2 border-l border-zinc-700">
          <GenericJsonView data={value as Record<string, unknown>} />
        </div>
      );
    }
    return String(value);
  };

  // 字段名称映射
  const fieldNames: Record<string, string> = {
    title: "标题",
    name: "名称",
    description: "描述",
    content: "内容",
    summary: "摘要",
    characters: "角色",
    protagonist: "主角",
    world_setting: "世界观",
    outline: "大纲",
    chapters: "章节",
    genre: "类型",
    concept: "概念",
    target_audience: "目标读者",
    selling_points: "卖点",
    background: "背景",
    personality: "性格",
    abilities: "能力",
    motivation: "动机",
  };

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key} className="space-y-1">
          <div className="text-xs text-zinc-500 font-medium">
            {fieldNames[key] || key}
          </div>
          <div className="text-sm">{formatValue(value)}</div>
        </div>
      ))}
    </div>
  );
}

export function StructuredResultView({
  result,
  parsedResult,
  phase,
  editable = true,
  onResultChange,
}: StructuredResultViewProps) {
  const [viewMode, setViewMode] = useState<"structured" | "raw">(parsedResult ? "structured" : "raw");
  const [editedResult, setEditedResult] = useState(result);

  // 当外部 result 变化时同步
  useMemo(() => {
    setEditedResult(result);
  }, [result]);

  // 尝试解析 JSON
  const displayData = useMemo(() => {
    if (parsedResult) return parsedResult;
    return tryParseJSON(result);
  }, [result, parsedResult]);

  // 结果变更时通知父组件
  const handleResultChange = (newValue: string) => {
    setEditedResult(newValue);
    onResultChange?.(newValue);
  };

  // 判断是否有可展示的结构化数据
  const hasStructuredData = displayData !== null && Object.keys(displayData).length > 0;

  return (
    <div className="space-y-3">
      {/* 视图切换 */}
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "structured" | "raw")}>
          <TabsList className="h-8 bg-zinc-800/50">
            {hasStructuredData && (
              <TabsTrigger value="structured" className="text-xs h-7 data-[state=active]:bg-purple-500/20">
                <Eye className="h-3 w-3 mr-1" />
                可视化
              </TabsTrigger>
            )}
            <TabsTrigger value="raw" className="text-xs h-7 data-[state=active]:bg-purple-500/20">
              <Edit3 className="h-3 w-3 mr-1" />
              {editable ? "编辑" : "原文"}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {viewMode === "raw" && editable && (
          <span className="text-xs text-zinc-500">可直接编辑内容</span>
        )}
      </div>

      {/* 内容区域 */}
      <ScrollArea className="h-[280px] rounded-lg border border-zinc-700 bg-zinc-900/50">
        {viewMode === "structured" && hasStructuredData ? (
          <div className="p-4">
            <PhaseSpecificView phase={phase} data={displayData} />
          </div>
        ) : (
          <div className="p-4">
            {editable ? (
              <Textarea
                value={editedResult}
                onChange={(e) => handleResultChange(e.target.value)}
                className="min-h-[240px] bg-transparent border-none resize-none text-sm text-zinc-300 focus:ring-0 p-0 font-mono"
                placeholder="生成结果将显示在这里..."
              />
            ) : (
              <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">
                {result || "暂无内容"}
              </pre>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
