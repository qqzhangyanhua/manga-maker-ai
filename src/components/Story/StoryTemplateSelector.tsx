"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface StoryTemplate {
    id: string;
    name: string;
    category: string;
    description: string;
    structure: { acts?: Array<unknown> };
    prompts: Record<string, unknown>;
}

interface StoryTemplateSelectorProps {
    onSelect: (template: StoryTemplate | null) => void;
    selected: StoryTemplate | null;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
    suspense: { label: "悬疑推理", color: "bg-purple-500" },
    romance: { label: "浪漫爱情", color: "bg-pink-500" },
    adventure: { label: "冒险", color: "bg-orange-500" },
    scifi: { label: "科幻", color: "bg-blue-500" },
    daily: { label: "日常", color: "bg-green-500" },
    fantasy: { label: "奇幻", color: "bg-indigo-500" },
};

export function StoryTemplateSelector({
    onSelect,
    selected,
}: StoryTemplateSelectorProps) {
    const [templates, setTemplates] = useState<StoryTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<string | null>(null);

    // Load templates on mount
    useState(() => {
        loadTemplates();
    });

    async function loadTemplates() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter) params.append("category", filter);

            const res = await fetch(`/api/story/templates?${params}`);
            const data = await res.json();

            if (data.success) {
                setTemplates(data.templates);
            }
        } catch (error) {
            console.error("Failed to load templates:", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">选择故事模板</h3>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelect(null)}
                >
                    不使用模板
                </Button>
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant={filter === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                        setFilter(null);
                        loadTemplates();
                    }}
                >
                    全部
                </Button>
                {Object.entries(CATEGORY_LABELS).map(([key, { label, color }]) => (
                    <Button
                        key={key}
                        variant={filter === key ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                            setFilter(key);
                            loadTemplates();
                        }}
                    >
                        <span className={`w-2 h-2 rounded-full ${color} mr-2`} />
                        {label}
                    </Button>
                ))}
            </div>

            {/* Templates grid */}
            {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                    加载中...
                </div>
            ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    暂无模板
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => {
                        const isSelected = selected?.id === template.id;
                        const categoryInfo = CATEGORY_LABELS[template.category];

                        return (
                            <Card
                                key={template.id}
                                className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-primary" : ""
                                    }`}
                                onClick={() => onSelect(template)}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                {template.name}
                                                {isSelected && (
                                                    <Check className="w-4 h-4 text-primary" />
                                                )}
                                            </CardTitle>
                                            <CardDescription className="mt-1">
                                                {template.description}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Badge className={categoryInfo?.color || "bg-gray-500"}>
                                        {categoryInfo?.label || template.category}
                                    </Badge>
                                    {template.structure?.acts && (
                                        <p className="text-sm text-muted-foreground mt-2">
                                            {template.structure.acts.length} 幕结构
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
