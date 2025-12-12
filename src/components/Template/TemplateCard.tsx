"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Download, Eye, Users } from "lucide-react";
import { PanelTemplate } from "@/types/template";
import { useState } from "react";

interface TemplateCardProps {
  template: PanelTemplate & {
    user?: {
      id: string;
      name: string | null;
      image: string | null;
    };
  };
  onLike?: (templateId: string, isLiked: boolean) => void;
  onApply?: (templateId: string) => void;
  isLiked?: boolean;
}

export function TemplateCard({ template, onLike, onApply, isLiked = false }: TemplateCardProps) {
  const [liked, setLiked] = useState(isLiked);
  const [likesCount, setLikesCount] = useState(template.likes_count);

  const handleLike = async () => {
    const newLikedState = !liked;
    setLiked(newLikedState);
    setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);
    onLike?.(template.id, newLikedState);
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardHeader className="space-y-2">
        {/* Template preview thumbnail */}
        <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
          {template.thumbnail_url ? (
            <img
              src={template.thumbnail_url}
              alt={template.name}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <div className="text-4xl font-bold mb-1">{template.panel_count}</div>
                <div className="text-xs">分镜模板</div>
              </div>
            </div>
          )}
          {template.is_official && (
            <Badge className="absolute top-2 left-2 bg-primary/90">官方</Badge>
          )}
        </div>

        {/* Template info */}
        <div>
          <h3 className="font-semibold text-base line-clamp-1">{template.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {template.description || "暂无描述"}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{template.tags.length - 3}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Heart className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
              {likesCount}
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              {template.usage_count}
            </span>
          </div>
          <span className="text-xs">{template.panel_count} 个分镜</span>
        </div>

        {/* Author */}
        {template.user && !template.is_official && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{template.user.name || "匿名用户"}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleLike}
        >
          <Heart className={`h-4 w-4 mr-1 ${liked ? "fill-red-500 text-red-500" : ""}`} />
          {liked ? "已喜欢" : "喜欢"}
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={() => onApply?.(template.id)}
        >
          <Download className="h-4 w-4 mr-1" />
          应用
        </Button>
      </CardFooter>
    </Card>
  );
}
