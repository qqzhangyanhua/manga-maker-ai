"use client";

import { StoryGenerator } from "@/components/Story/StoryGenerator";

export default function StoryPage() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">故事创作</h1>
                <p className="text-muted-foreground">
                    使用AI生成完整的故事大纲,然后转换为漫画分镜
                </p>
            </div>

            <StoryGenerator
                onStoryGenerated={(story) => {
                    console.log("Story generated:", story);
                }}
            />
        </div>
    );
}
