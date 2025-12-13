import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Copy, Trash2 } from "lucide-react";
import type { Provider } from "../types";

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
              <TableHead className="w-[80px] min-w-[80px] sticky left-0 bg-muted z-20 shadow-[inset_-1px_0_0_0_hsl(var(--border))]">
                ID
              </TableHead>
              <TableHead className="min-w-[120px] sticky left-[80px] bg-muted z-20 shadow-[inset_-1px_0_0_0_hsl(var(--border))]">
                Type
              </TableHead>
              <TableHead className="min-w-[100px]">Name</TableHead>
              <TableHead className="min-w-[150px]">Model</TableHead>
              <TableHead className="min-w-[200px]">Base URL</TableHead>
              <TableHead className="min-w-[80px]">Priority</TableHead>
              <TableHead className="min-w-[200px]">描述</TableHead>
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
                  <TableCell className="sticky left-0 bg-background z-10 shadow-[inset_-1px_0_0_0_hsl(var(--border))] p-0 relative">
                    <div className={`absolute inset-y-0 left-0 w-1 ${p.enabled ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                    <div className="px-4 py-2 h-full flex items-center">
                      {p.id}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium sticky left-[80px] bg-background z-10 shadow-[inset_-1px_0_0_0_hsl(var(--border))]">
                    {p.provider_type}
                  </TableCell>
                  <TableCell>{p.provider_name}</TableCell>
                  <TableCell>{p.model}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={p.base_url}>
                    {p.base_url}
                  </TableCell>
                  <TableCell>{p.priority}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={p.desc || ""}>
                    {p.desc || "-"}
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



