/**
 * 世界观条目详情组件
 */
"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  User,
  Calendar,
  Package,
  BookOpen,
  Eye,
  Edit,
  Trash2,
  Link2,
  Plus,
  X,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { worldService } from "../../services/worldService";
import {
  WorldEntry,
  WorldRelation,
  EntryType,
  ENTRY_TYPE_CONFIG,
  FORESHADOW_STATUS_CONFIG,
  ForeshadowStatus,
  RELATION_TYPE_GROUPS,
  EntryListResponse,
} from "../../types/world";

interface EntryDetailProps {
  entry: WorldEntry;
  projectId: string;
  onEdit: () => void;
  onDelete: () => void;
  onRelationChange: () => void;
}

const ENTRY_ICONS: Record<EntryType, React.ElementType> = {
  location: MapPin,
  character: User,
  event: Calendar,
  item: Package,
  rule: BookOpen,
  foreshadowing: Eye,
};

export function EntryDetail({
  entry,
  projectId,
  onEdit,
  onDelete,
  onRelationChange,
}: EntryDetailProps) {
  const Icon = ENTRY_ICONS[entry.type];
  const config = ENTRY_TYPE_CONFIG[entry.type];
  const isForeshadowing = entry.type === "foreshadowing";

  // 添加关系对话框状态
  const [isAddRelationOpen, setIsAddRelationOpen] = useState(false);
  const [relationLoading, setRelationLoading] = useState(false);
  const [availableEntries, setAvailableEntries] = useState<WorldEntry[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [selectedRelationType, setSelectedRelationType] = useState<string>("");
  const [relationDescription, setRelationDescription] = useState("");

  // 加载可用条目
  useEffect(() => {
    if (isAddRelationOpen) {
      loadAvailableEntries();
    }
  }, [isAddRelationOpen]);

  const loadAvailableEntries = async () => {
    try {
      const response: EntryListResponse = await worldService.listEntries(projectId, {
        limit: 100,
      });
      // 排除自身
      setAvailableEntries(response.entries.filter((e) => e.id !== entry.id));
    } catch (err) {
      toast.error("加载条目列表失败");
    }
  };

  // 创建关系
  const handleCreateRelation = async () => {
    if (!selectedTargetId || !selectedRelationType) {
      toast.error("请选择目标条目和关系类型");
      return;
    }

    setRelationLoading(true);
    try {
      await worldService.createRelation(projectId, {
        source_id: entry.id,
        target_id: selectedTargetId,
        relation_type: selectedRelationType,
        description: relationDescription || undefined,
      });
      toast.success("关系创建成功");
      setIsAddRelationOpen(false);
      setSelectedTargetId("");
      setSelectedRelationType("");
      setRelationDescription("");
      onRelationChange();
    } catch (err) {
      const message = err instanceof Error ? err.message : "创建失败";
      toast.error(message);
    } finally {
      setRelationLoading(false);
    }
  };

  // 删除关系
  const handleDeleteRelation = async (relationId: string) => {
    try {
      await worldService.deleteRelation(projectId, relationId);
      toast.success("关系已删除");
      onRelationChange();
    } catch (err) {
      const message = err instanceof Error ? err.message : "删除失败";
      toast.error(message);
    }
  };

  // 渲染关系项
  const renderRelation = (relation: WorldRelation, isOutgoing: boolean) => {
    const targetName = isOutgoing ? relation.target_name : relation.source_name;
    const targetType = isOutgoing ? relation.target_type : relation.source_type;
    const TargetIcon = targetType ? ENTRY_ICONS[targetType as EntryType] : BookOpen;

    return (
      <div
        key={relation.id}
        className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {relation.relation_type}
          </Badge>
          {isOutgoing ? (
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ArrowRight className="h-3 w-3 text-muted-foreground rotate-180" />
          )}
          <div className="flex items-center gap-1">
            <TargetIcon className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{targetName}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          onClick={() => handleDeleteRelation(relation.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  return (
    <ScrollArea className="h-[calc(100vh-200px)] pr-4">
      <div className="space-y-6 py-4">
        {/* 头部信息 */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={cn("p-3 rounded-lg", config.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{entry.name}</h3>
              <Badge variant="secondary" className="mt-1">
                {config.label}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-1" />
              编辑
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 伏笔状态 */}
        {isForeshadowing && entry.foreshadow_status && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">状态：</span>
            <Badge
              className={cn(
                FORESHADOW_STATUS_CONFIG[entry.foreshadow_status as ForeshadowStatus].color
              )}
            >
              {FORESHADOW_STATUS_CONFIG[entry.foreshadow_status as ForeshadowStatus].label}
            </Badge>
          </div>
        )}

        {/* 描述 */}
        {entry.description && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">描述</h4>
            <p className="text-sm whitespace-pre-wrap">{entry.description}</p>
          </div>
        )}

        {/* 伏笔章节信息 */}
        {isForeshadowing && (
          <div className="grid grid-cols-2 gap-4">
            {entry.planted_chapter && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  埋设章节
                </h4>
                <p className="text-sm">第 {entry.planted_chapter} 章</p>
              </div>
            )}
            {entry.planned_reveal_chapter && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  计划揭示
                </h4>
                <p className="text-sm">第 {entry.planned_reveal_chapter} 章</p>
              </div>
            )}
            {entry.actual_reveal_chapter && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  实际揭示
                </h4>
                <p className="text-sm">第 {entry.actual_reveal_chapter} 章</p>
              </div>
            )}
            {entry.hint_text && (
              <div className="col-span-2">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  提示线索
                </h4>
                <p className="text-sm">{entry.hint_text}</p>
              </div>
            )}
          </div>
        )}

        {/* 属性 */}
        {entry.properties && Object.keys(entry.properties).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">属性</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(entry.properties).map(([key, value]) => {
                const schema = ENTRY_TYPE_CONFIG[entry.type].properties[key];
                return (
                  <div key={key} className="text-sm">
                    <span className="text-muted-foreground">
                      {schema?.label || key}：
                    </span>
                    <span>{value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 标签 */}
        {entry.tags && entry.tags.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">标签</h4>
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* 关系 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">关联关系</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddRelationOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              添加关系
            </Button>
          </div>

          {/* 出向关系 */}
          {entry.relations && entry.relations.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs text-muted-foreground">指向其他条目</p>
              {entry.relations.map((rel) => renderRelation(rel, true))}
            </div>
          )}

          {/* 入向关系 */}
          {entry.referenced_by && entry.referenced_by.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">被其他条目引用</p>
              {entry.referenced_by.map((rel) => renderRelation(rel, false))}
            </div>
          )}

          {(!entry.relations || entry.relations.length === 0) &&
            (!entry.referenced_by || entry.referenced_by.length === 0) && (
              <p className="text-sm text-muted-foreground">暂无关联关系</p>
            )}
        </div>

        {/* 元信息 */}
        <div className="text-xs text-muted-foreground">
          <p>创建于：{new Date(entry.created_at).toLocaleString()}</p>
          <p>更新于：{new Date(entry.updated_at).toLocaleString()}</p>
        </div>
      </div>

      {/* 添加关系对话框 */}
      <Dialog open={isAddRelationOpen} onOpenChange={setIsAddRelationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加关系</DialogTitle>
            <DialogDescription>
              为 "{entry.name}" 添加与其他条目的关联关系
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>目标条目</Label>
              <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择目标条目" />
                </SelectTrigger>
                <SelectContent>
                  {availableEntries.map((e) => {
                    const EIcon = ENTRY_ICONS[e.type];
                    return (
                      <SelectItem key={e.id} value={e.id}>
                        <div className="flex items-center gap-2">
                          <EIcon className="h-3 w-3" />
                          <span>{e.name}</span>
                          <Badge variant="outline" className="text-xs ml-2">
                            {ENTRY_TYPE_CONFIG[e.type].label}
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>关系类型</Label>
              <Select
                value={selectedRelationType}
                onValueChange={setSelectedRelationType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择关系类型" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RELATION_TYPE_GROUPS).map(([category, group]) => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {group.label}
                      </div>
                      {group.types.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>描述（可选）</Label>
              <Textarea
                value={relationDescription}
                onChange={(e) => setRelationDescription(e.target.value)}
                placeholder="描述这个关系..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRelationOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateRelation} disabled={relationLoading}>
              {relationLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}
