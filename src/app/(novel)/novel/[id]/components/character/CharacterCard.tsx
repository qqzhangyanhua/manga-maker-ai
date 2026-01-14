/**
 * 角色卡片组件
 */
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Edit, Trash2, User } from "lucide-react";
import type { Character } from "./types";
import { getRoleColor } from "./types";

interface CharacterCardProps {
  character: Character;
  onEdit: (character: Character) => void;
  onDelete: (id: string) => void;
}

export function CharacterCard({ character, onEdit, onDelete }: CharacterCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow bg-zinc-900/40 border-purple-500/10 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className={getRoleColor(character.role)}>
              {character.name.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">{character.name}</CardTitle>
            <Badge variant="secondary" className="mt-1">
              {character.role}
            </Badge>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(character)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(character.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {character.description || "暂无描述"}
        </p>
        {(character.traits || []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(character.traits || []).slice(0, 3).map((trait, i) => (
              <Badge key={`trait-${trait}-${i}`} variant="outline" className="text-xs">
                {trait}
              </Badge>
            ))}
            {(character.traits || []).length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{(character.traits || []).length - 3}
              </Badge>
            )}
          </div>
        )}
        {(character.relationships || []).length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{(character.relationships || []).length} 个关系</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
