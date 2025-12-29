import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filters } from "../types";

type CharacterFilterBarProps = {
  filters: Filters;
  loading: boolean;
  onFiltersChange: (filters: Filters) => void;
  onSearch: () => void;
};

export const CharacterFilterBar = ({
  filters,
  loading,
  onFiltersChange,
  onSearch,
}: CharacterFilterBarProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-border rounded-lg bg-card">
      <div className="space-y-2">
        <Label>关键词（名称/描述/提示词）</Label>
        <Input
          placeholder="模糊搜索"
          value={filters.keyword}
          onChange={(e) =>
            onFiltersChange({ ...filters, keyword: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label>用户 ID</Label>
        <Input
          placeholder="指定用户"
          value={filters.userId}
          onChange={(e) =>
            onFiltersChange({ ...filters, userId: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label>训练状态</Label>
        <Select
          value={filters.status}
          onValueChange={(val) =>
            onFiltersChange({ ...filters, status: val as Filters["status"] })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="全部" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="pending">待训练</SelectItem>
            <SelectItem value="training">训练中</SelectItem>
            <SelectItem value="ready">可用</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end gap-2">
        <Button className="w-full" onClick={onSearch} disabled={loading}>
          查询
        </Button>
      </div>
    </div>
  );
};
