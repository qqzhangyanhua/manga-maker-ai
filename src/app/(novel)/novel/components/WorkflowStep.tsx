/**
 * 工作流步骤组件
 * 显示模板输入表单，收集用户输入
 */
"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info, AlertCircle } from "lucide-react";

interface Template {
  id: string;
  code: string;
  name: string;
  description: string | null;
  phase: string;
  phase_display: string;
  category: string;
  genre: string | null;
  usage_count: number;
}

interface TemplateSlot {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  data_type: string;
  required: boolean;
  default_value: string | null;
  options: string[] | null;
}

interface TemplateDetail extends Template {
  system_role: string;
  chain_of_thought: Array<{
    level: string;
    title: string;
    content: string[];
  }>;
  output_schema: Record<string, unknown> | null;
  input_slots: TemplateSlot[];
  output_slots: TemplateSlot[];
}

interface WorkflowStepProps {
  template: Template | null;
  inputData: Record<string, string>;
  onInputChange: (data: Record<string, string>) => void;
}

export function WorkflowStep({
  template,
  inputData,
  onInputChange,
}: WorkflowStepProps) {
  const [templateDetail, setTemplateDetail] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // 获取模板详情
  useEffect(() => {
    if (!template?.id) {
      setTemplateDetail(null);
      return;
    }

    const fetchTemplateDetail = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/novel/templates/${template.id}`);
        if (response.ok) {
          const data = await response.json();
          setTemplateDetail(data.template);

          // 设置默认值
          const defaults: Record<string, string> = {};
          for (const slot of data.template.input_slots || []) {
            if (slot.default_value && !inputData[slot.name]) {
              defaults[slot.name] = slot.default_value;
            }
          }
          if (Object.keys(defaults).length > 0) {
            onInputChange({ ...inputData, ...defaults });
          }
        }
      } catch (error) {
        console.error("获取模板详情失败:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplateDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id]);

  // 更新输入值
  const handleInputChange = (name: string, value: string) => {
    onInputChange({ ...inputData, [name]: value });
  };

  // 未选择模板时的提示
  if (!template) {
    return (
      <div className="h-[300px] rounded-lg border border-zinc-700 bg-zinc-900/50 flex flex-col items-center justify-center text-zinc-500">
        <Info className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">请先选择一个模板</p>
      </div>
    );
  }

  // 加载中
  if (loading) {
    return (
      <div className="h-[300px] rounded-lg border border-zinc-700 bg-zinc-900/50 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin mb-2" />
        <p className="text-sm text-zinc-500">加载模板详情...</p>
      </div>
    );
  }

  // 无输入插槽
  if (!templateDetail?.input_slots?.length) {
    return (
      <div className="h-[300px] rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-amber-500">此模板无需输入参数</span>
        </div>
        <p className="text-sm text-zinc-400">
          点击"开始生成"按钮直接执行此模板。
        </p>
        {templateDetail?.system_role && (
          <div className="mt-4">
            <p className="text-xs text-zinc-500 mb-2">模板说明：</p>
            <p className="text-xs text-zinc-400 line-clamp-4">
              {templateDetail.system_role.split("\n")[0]}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] rounded-lg border border-zinc-700 bg-zinc-900/50">
      <div className="p-4 space-y-4">
        {/* 模板说明 */}
        {templateDetail?.system_role && (
          <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
            <p className="text-xs text-zinc-500 mb-1">模板角色</p>
            <p className="text-xs text-zinc-400 line-clamp-3">
              {templateDetail.system_role.split("\n")[0].replace(/^你是.+?[，,]/, "")}
            </p>
          </div>
        )}

        {/* 输入字段 */}
        {templateDetail.input_slots.map((slot) => (
          <div key={slot.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Label
                htmlFor={slot.name}
                className="text-sm font-medium text-zinc-300"
              >
                {slot.display_name}
              </Label>
              {slot.required && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 bg-red-500/10 text-red-400 border-red-500/30"
                >
                  必填
                </Badge>
              )}
            </div>

            {slot.description && (
              <p className="text-xs text-zinc-500">{slot.description}</p>
            )}

            {slot.data_type === "choice" && slot.options ? (
              // 选择类型
              <select
                id={slot.name}
                value={inputData[slot.name] || ""}
                onChange={(e) => handleInputChange(slot.name, e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">请选择...</option>
                {slot.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : slot.data_type === "json" ||
              slot.name.includes("setting") ||
              slot.name.includes("outline") ||
              slot.name.includes("content") ? (
              // 长文本类型
              <Textarea
                id={slot.name}
                value={inputData[slot.name] || ""}
                onChange={(e) => handleInputChange(slot.name, e.target.value)}
                placeholder={`请输入${slot.display_name}...`}
                rows={4}
                className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 resize-none"
              />
            ) : (
              // 普通文本类型
              <Input
                id={slot.name}
                type="text"
                value={inputData[slot.name] || ""}
                onChange={(e) => handleInputChange(slot.name, e.target.value)}
                placeholder={`请输入${slot.display_name}...`}
                className="bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500"
              />
            )}
          </div>
        ))}

        {/* 输出说明 */}
        {templateDetail?.output_slots?.length > 0 && (
          <div className="pt-4 border-t border-zinc-700">
            <p className="text-xs text-zinc-500 mb-2">生成后将输出：</p>
            <div className="flex flex-wrap gap-1">
              {templateDetail.output_slots.map((slot) => (
                <Badge
                  key={slot.id}
                  variant="outline"
                  className="text-xs bg-green-500/10 text-green-400 border-green-500/30"
                >
                  {slot.display_name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
