import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Copy, Trash2, Zap, Star } from "lucide-react";
import type { Provider } from "../types";
import { getProviderTypeLabel } from "../types";

interface ProviderTableProps {
  providers: Provider[];
  loading: boolean;
  onEdit: (provider: Provider) => void;
  onCopy: (provider: Provider) => void;
  onDelete: (provider: Provider) => void;
}

export const ProviderTable = ({
  providers,
  loading,
  onEdit,
  onCopy,
  onDelete,
}: ProviderTableProps) => {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto max-h-[calc(100vh-400px)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] min-w-[100px] sticky left-0 bg-muted z-20 shadow-[inset_-1px_0_0_0_hsl(var(--border))]">
                状态
              </TableHead>
              <TableHead className="min-w-[120px] sticky left-[100px] bg-muted z-20 shadow-[inset_-1px_0_0_0_hsl(var(--border))]">
                Type
              </TableHead>
              <TableHead className="min-w-[100px]">Name</TableHead>
              <TableHead className="min-w-[150px]">Model</TableHead>
              <TableHead className="min-w-[80px]">Priority</TableHead>
              <TableHead className="min-w-[90px]">
                <div className="flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  算力
                </div>
              </TableHead>
              <TableHead className="min-w-[250px]">Base URL</TableHead>
              <TableHead className="min-w-[140px] sticky right-0 bg-muted z-20 text-right shadow-[inset_1px_0_0_0_hsl(var(--border))]">
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  正在加载...
                </TableCell>
              </TableRow>
            ) : providers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  暂无配置，先在上方添加一条记录。
                </TableCell>
              </TableRow>
            ) : (
              providers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="sticky left-0 bg-background z-10 shadow-[inset_-1px_0_0_0_hsl(var(--border))]">
                    <div className="flex items-center gap-2">
                      <Badge variant={p.enabled ? "default" : "secondary"}>
                        {p.enabled ? "启用" : "禁用"}
                      </Badge>
                      {p.priority === 1 && (
                        <Badge variant="outline" className="gap-1">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          优先
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium sticky left-[100px] bg-background z-10 shadow-[inset_-1px_0_0_0_hsl(var(--border))]">
                    {getProviderTypeLabel(p.provider_type)}
                  </TableCell>
                  <TableCell>{p.provider_name}</TableCell>
                  <TableCell>{p.model}</TableCell>
                  <TableCell>{p.priority}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 ${p.credits_cost > 0 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                      {p.credits_cost > 0 ? p.credits_cost : "免费"}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate font-mono text-xs" title={p.base_url}>
                    {p.base_url}
                  </TableCell>
                  <TableCell className="sticky right-0 bg-background z-10 shadow-[inset_1px_0_0_0_hsl(var(--border))]">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onEdit(p)}
                        title="编辑"
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onCopy(p)}
                        title="复制"
                        className="h-8 w-8"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(p)}
                        title="删除"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};










