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
              <TableHead className="min-w-[60px]">ID</TableHead>
              <TableHead className="min-w-[120px]">Type</TableHead>
              <TableHead className="min-w-[100px]">Name</TableHead>
              <TableHead className="min-w-[150px]">Model</TableHead>
              <TableHead className="min-w-[200px]">Base URL</TableHead>
              <TableHead className="min-w-[80px]">Priority</TableHead>
              <TableHead className="min-w-[80px]">Enabled</TableHead>
              <TableHead className="min-w-[200px]">描述</TableHead>
              <TableHead className="min-w-[140px] sticky right-0 bg-muted z-10 text-right shadow-[inset_0_0_0_1px_hsl(var(--border))]">
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  正在加载...
                </TableCell>
              </TableRow>
            ) : providers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  暂无配置，先在上方添加一条记录。
                </TableCell>
              </TableRow>
            ) : (
              providers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell className="font-medium">{p.provider_type}</TableCell>
                  <TableCell>{p.provider_name}</TableCell>
                  <TableCell>{p.model}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={p.base_url}>
                    {p.base_url}
                  </TableCell>
                  <TableCell>{p.priority}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        p.enabled
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {p.enabled ? "是" : "否"}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={p.desc || ""}>
                    {p.desc || "-"}
                  </TableCell>
                  <TableCell className="sticky right-0 bg-background z-10 shadow-[inset_0_0_0_1px_hsl(var(--border))]">
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


