"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { StoryTemplateSelector } from "./StoryTemplateSelector";
import type { StoryTemplate } from "./types";

interface StoryTemplateStepProps {
    selectedTemplate: StoryTemplate | null;
    onTemplateSelect: (template: StoryTemplate | null) => void;
    onBack: () => void;
    onContinue: () => void;
}

export function StoryTemplateStep({
    selectedTemplate,
    onTemplateSelect,
    onBack,
    onContinue,
}: StoryTemplateStepProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>选择故事模板</CardTitle>
                <CardDescription>
                    使用预设模板可以帮助AI生成更符合特定类型的故事结构
                </CardDescription>
            </CardHeader>
            <CardContent>
                <StoryTemplateSelector
                    selected={selectedTemplate}
                    onSelect={onTemplateSelect}
                />
                <div className="flex gap-2 mt-6">
                    <Button variant="outline" onClick={onBack}>
                        返回
                    </Button>
                    <Button onClick={onContinue} className="flex-1">
                        继续
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
