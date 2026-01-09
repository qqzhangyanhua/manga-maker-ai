/**
 * 规则编辑器组件
 */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import type { Rule } from "./types";
import { createNewRule } from "./types";

interface RuleEditorProps {
  rules: Rule[];
  onChange: (rules: Rule[]) => void;
}

export function RuleEditor({ rules, onChange }: RuleEditorProps) {
  const addRule = () => {
    onChange([...rules, createNewRule()]);
  };

  const updateRule = (index: number, field: keyof Rule, value: string) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    onChange(newRules);
  };

  const removeRule = (index: number) => {
    onChange(rules.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <Button onClick={addRule} variant="outline">
        <Plus className="mr-2 h-4 w-4" />
        添加规则
      </Button>
      {rules.map((rule, index) => (
        <Card key={rule.id || `rule-${index}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              规则 {index + 1}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeRule(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">标题</label>
                <Input
                  value={rule.title}
                  onChange={(e) => updateRule(index, "title", e.target.value)}
                  placeholder="例如：魔法等级体系"
                />
              </div>
              <div>
                <label className="text-sm font-medium">分类</label>
                <Input
                  value={rule.category}
                  onChange={(e) => updateRule(index, "category", e.target.value)}
                  placeholder="例如：魔法、科技、社会"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">详细说明</label>
              <Textarea
                value={rule.content}
                onChange={(e) => updateRule(index, "content", e.target.value)}
                placeholder="详细描述这个规则的运作方式、限制、特例..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
