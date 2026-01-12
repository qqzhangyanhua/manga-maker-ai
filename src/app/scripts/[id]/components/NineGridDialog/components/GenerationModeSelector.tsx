/**
 * Generation mode selector component
 */

"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormDescription } from "@/components/ui/form";
import { List, Sparkles } from "lucide-react";
import type { GenerationMode } from "../types";

interface GenerationModeSelectorProps {
    value: GenerationMode;
    onChange: (mode: GenerationMode) => void;
}

export function GenerationModeSelector({ value, onChange }: GenerationModeSelectorProps) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">生成模式</label>
            <Tabs value={value} onValueChange={(v) => onChange(v as GenerationMode)}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="from-panels" className="flex items-center gap-2">
                        <List className="w-4 h-4" />
                        从现有分镜
                    </TabsTrigger>
                    <TabsTrigger value="from-plot" className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        从剧情生成
                    </TabsTrigger>
                </TabsList>
            </Tabs>
            <FormDescription>
                {value === "from-panels"
                    ? "从章节中选择 9 个现有分镜生成九宫格"
                    : "输入剧情概述，AI 自动生成 9 个分镜并合成九宫格"}
            </FormDescription>
        </div>
    );
}
