import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { Character, UserMeta, statusLabel } from "../types";

type CharacterTableProps = {
  characters: Character[];
  userMap: Record<string, UserMeta>;
  loading: boolean;
  onEdit: (character: Character) => void;
  onDelete: (character: Character) => void;
};

export const CharacterTable = ({
  characters,
  userMap,
  loading,
  onEdit,
  onDelete,
}: CharacterTableProps) => {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>角色名称</TableHead>
            <TableHead>用户</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>标签</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead className="w-32 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                正在加载...
              </TableCell>
            </TableRow>
          )}
          {!loading && characters.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                暂无数据
              </TableCell>
            </TableRow>
          )}
          {!loading &&
            characters.map((character) => {
              const user = userMap[character.user_id];
              return (
                <TableRow key={character.id}>
                  <TableCell>
                    <div className="font-medium">{character.name}</div>
                    {character.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {character.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{user?.email || "未知用户"}</div>
                    <div className="text-xs text-muted-foreground">
                      {user?.name || character.user_id}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {statusLabel[character.training_status]}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      进度 {character.training_progress ?? 0}%
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {character.tags?.length ? character.tags.join("，") : "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(character.created_at).toLocaleString("zh-CN")}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(character)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => onDelete(character)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </div>
  );
};
