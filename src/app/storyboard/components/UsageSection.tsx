import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UsageBadge } from "./UsageBadge";
import { TemplateWithMeta } from "@/types/template";
import { TEMPLATE_NONE_VALUE } from "../constants";

type UsageItem = {
  remaining: number | null;
  limit: number | null;
  count: number;
};

type Usage = {
  storyboard_generation?: UsageItem;
  image_generation?: UsageItem;
  llm_chat?: UsageItem;
};

type UsageSectionProps = {
  usage: Usage | null;
  usageLoading: boolean;
  panelTemplates: TemplateWithMeta[];
  selectedPanelTemplateId: string | null;
  onPanelTemplateChange: (id: string | null) => void;
};

export function UsageSection({
  usage,
  usageLoading,
  panelTemplates,
  selectedPanelTemplateId,
  onPanelTemplateChange,
}: UsageSectionProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-6 items-center">
      <div className="text-sm text-muted-foreground">今日用量</div>
      <UsageBadge
        label="分镜生成"
        item={usage?.storyboard_generation}
        loading={usageLoading}
      />
      <UsageBadge label="图像生成" item={usage?.image_generation} loading={usageLoading} />
      <UsageBadge label="聊天/LLM" item={usage?.llm_chat} loading={usageLoading} />
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">分镜模板</span>
        <Select
          value={selectedPanelTemplateId ?? TEMPLATE_NONE_VALUE}
          onValueChange={(value) =>
            onPanelTemplateChange(value === TEMPLATE_NONE_VALUE ? null : value)
          }
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="可选：官方模板" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TEMPLATE_NONE_VALUE}>不使用模板</SelectItem>
            {panelTemplates.map((tpl) => (
              <SelectItem key={tpl.id} value={tpl.id}>
                {tpl.name} · {tpl.template_data?.meta?.category || "模板"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
