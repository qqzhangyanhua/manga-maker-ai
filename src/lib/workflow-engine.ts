/**
 * Workflow Engine - Orchestrates the entire comic generation process
 * Story → Script → Storyboard → Images → Export
 */

import { prisma, Prisma } from "./db";
import { generateStoryOutline } from "./story-generator";
import { callChatCompletionByType } from "./llm-provider";
import { generateImageBatch } from "./unified-image-generation";
import { ensureDefaultChapter, ensureStoryProject } from "./project";
import type { StoryOutline, StoryboardData, WorkflowConfig, WorkflowResult, WorkflowStatus, WorkflowStep } from "./type";

export type { WorkflowConfig, WorkflowResult, WorkflowStatus, WorkflowStep } from "./type";

export class WorkflowEngine {
    private workflowId: string;
    private userId: string;
    private config: WorkflowConfig;

    constructor(workflowId: string, userId: string, config: WorkflowConfig) {
        this.workflowId = workflowId;
        this.userId = userId;
        this.config = config;
    }

    /**
     * Start the workflow
     */
    async start(): Promise<WorkflowResult> {
        try {
            await this.updateStatus("running", "story", 0);

            // Step 1: Generate story
            const story = await this.generateStory();
            await this.updateStatus("running", "storyboard", 25);

            // Step 2: Generate storyboard from story
            const project = await this.generateStoryboard(story.id);
            await this.updateStatus("running", "images", 50);

            // Step 3: Generate images (if enabled)
            let generatedImages = 0;
            if (this.config.generateImages) {
                generatedImages = await this.generateImages(project.id);
                await this.updateStatus("running", "export", 75);
            }

            // Step 4: Export (if configured) - 生成导出链接供用户下载
            const exportUrls: string[] = [];
            if (this.config.exportFormat) {
                const format = this.config.exportFormat;
                if (format === "pdf" || format === "both") {
                    exportUrls.push(`/api/project/${project.id}/export?format=pdf`);
                }
                if (format === "images" || format === "both") {
                    exportUrls.push(`/api/project/${project.id}/export?format=zip`);
                }
                await this.updateStatus("running", "export", 90);
            }

            // Complete
            await this.updateStatus("completed", "complete", 100, {
                storyId: story.id,
                projectId: project.id,
                panelCount: project.panels.length,
                generatedImages,
                exportUrls,
            });

            return {
                storyId: story.id,
                projectId: project.id,
                panelCount: project.panels.length,
                generatedImages,
                exportUrls,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            await this.updateStatus("failed", undefined, undefined, undefined, errorMessage);
            throw error;
        }
    }

    /**
     * Step 1: Generate story
     */
    private async generateStory() {
        const outline = await generateStoryOutline({
            premise: this.config.premise,
            genre: this.config.genre,
            characterCount: this.config.characterCount,
            length: this.config.storyLength,
            templateId: this.config.templateId,
        });

        const story = await prisma.story.create({
            data: {
                user_id: this.userId,
                title: outline.title,
                premise: this.config.premise,
                genre: outline.genre,
                outline: outline as unknown as Prisma.InputJsonValue,
                template_id: this.config.templateId || null,
                status: "completed",
            },
        });

        return story;
    }

    /**
     * Step 2: Generate storyboard from story
     */
    private async generateStoryboard(storyId: string): Promise<Prisma.ProjectGetPayload<{ include: { panels: true } }>> {
        const story = await prisma.story.findUnique({
            where: { id: storyId },
            include: {
                story_characters: {
                    include: {
                        character: true,
                    },
                },
            },
        });

        if (!story) {
            throw new Error("Story not found");
        }

        const outline = story.outline as StoryOutline | null;
        const outlineLogline = outline?.logline || "";
        const outlineActs = Array.isArray(outline?.acts) ? outline.acts : [];

        // Convert story to storyboard script
        const storyboardPrompt = `
根据以下故事大纲,生成漫画分镜脚本:

标题: ${story.title}
类型: ${story.genre}
梗概: ${outlineLogline}

角色:
${story.story_characters.map((sc) => `- ${sc.character.name}: ${sc.character.description || ""}`).join("\n")}

剧情:
${outlineActs.map((act, index) => `
第${index + 1}幕: ${act.name}
${act.summary || ""}
场景: ${Array.isArray(act.scenes) ? act.scenes.join(", ") : ""}
`).join("\n")}

请生成${this.config.panelCount || "6-8"}个分镜,包含详细的场景描述、对话和视觉提示词。
`;

        const { content } = await callChatCompletionByType({
            providerType: "storyboard",
            messages: [
                {
                    role: "system",
                    content: `你是一位资深的漫画分镜导演。将故事转换为分镜脚本,输出JSON格式。`,
                },
                { role: "user", content: storyboardPrompt },
            ],
            temperature: 0.7,
            maxTokens: 3000,
            options: {
                userId: this.userId,
            },
        });

        let storyboardData: StoryboardData;
        try {
            storyboardData = JSON.parse(content) as StoryboardData;
        } catch {
            throw new Error("Failed to parse storyboard data");
        }

        const storyboardPanels = Array.isArray(storyboardData.panels) ? storyboardData.panels : [];
        const scriptSegments = Array.isArray(storyboardData.script_segments)
            ? (storyboardData.script_segments as Prisma.InputJsonValue)
            : undefined;

        // 分镜写入故事的主项目（新建故事时由数据库触发器创建）
        const storyProject = await ensureStoryProject(prisma, storyId);
        const chapterId = await ensureDefaultChapter(prisma, storyProject.id);
        const project = (await prisma.project.update({
            where: { id: storyProject.id },
            data: {
                description: story.premise,
                style: this.config.style || storyboardData.style || "manga",
                status: "in_progress",
                updated_at: new Date(),
                panels: {
                    create: storyboardPanels.map((panel, index) => ({
                        chapter_id: chapterId,
                        panel_order: panel.panel_order ?? index + 1,
                        panel_type: panel.panel_type ?? null,
                        importance: panel.importance ?? null,
                        description: panel.description ?? null,
                        dialogue: panel.dialogue || null,
                        character_name: panel.character_name || null,
                        emotion: panel.emotion || null,
                        prompt_used: panel.english_prompt || panel.visual_prompt,
                        camera_angle: panel.camera_angle || null,
                        shot_size: panel.shot_size || null,
                        visual_prompt: panel.visual_prompt || panel.description,
                    })),
                },
                script: Array.isArray(scriptSegments)
                    ? {
                        create: {
                            content: story.premise,
                            segments: scriptSegments,
                        },
                    }
                    : undefined,
            },
            include: {
                panels: {
                    orderBy: { panel_order: "asc" },
                },
            },
        })) as Prisma.ProjectGetPayload<{ include: { panels: true } }>;

        return project;
    }

    /**
     * Step 3: Generate images for all panels
     */
    private async generateImages(projectId: string): Promise<number> {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                panels: {
                    where: { prompt_used: { not: null } },
                    orderBy: { panel_order: "asc" },
                },
            },
        });

        if (!project || project.panels.length === 0) {
            return 0;
        }

        // Submit all panels to image generation queue
        const tasks = project.panels.map((panel) => ({
            type: "panel" as const,
            prompt: `${panel.prompt_used}, ${project.style}, high quality, detailed`,
            userId: this.userId,
            metadata: { panel_id: panel.id, project_id: projectId },
        }));

        await generateImageBatch(tasks);

        return project.panels.length;
    }

    /**
     * Update workflow status in database
     */
    private async updateStatus(
        status: WorkflowStatus,
        currentStep?: WorkflowStep,
        progress?: number,
        result?: Prisma.InputJsonValue,
        error?: string
    ) {
        await prisma.workflow.update({
            where: { id: this.workflowId },
            data: {
                status,
                current_step: currentStep,
                progress,
                result: result ?? undefined,
                error,
                updated_at: new Date(),
                ...(status === "completed" && { completed_at: new Date() }),
                ...(status === "running" && !currentStep && { started_at: new Date() }),
            },
        });
    }

    /**
     * Resume a workflow from where it left off
     */
    static async resume(workflowId: string): Promise<WorkflowResult> {
        const workflow = await prisma.workflow.findUnique({
            where: { id: workflowId },
        });

        if (!workflow) {
            throw new Error("Workflow not found");
        }

        if (workflow.status === "completed") {
            return workflow.result as WorkflowResult;
        }

        if (workflow.status === "failed" || workflow.status === "cancelled") {
            throw new Error(`Workflow is ${workflow.status}`);
        }

        const engine = new WorkflowEngine(
            workflowId,
            workflow.user_id,
            workflow.config as unknown as WorkflowConfig
        );

        return await engine.start();
    }

    /**
     * Cancel a workflow
     */
    static async cancel(workflowId: string): Promise<void> {
        await prisma.workflow.update({
            where: { id: workflowId },
            data: {
                status: "cancelled",
                updated_at: new Date(),
                completed_at: new Date(),
            },
        });
    }
}

/**
 * Create and start a new workflow
 */
export async function createWorkflow(
    userId: string,
    config: WorkflowConfig
): Promise<{ workflowId: string; result?: WorkflowResult }> {
    // Create workflow record
    const workflow = await prisma.workflow.create({
        data: {
            user_id: userId,
            type: "auto_generate",
            status: "pending",
            current_step: null,
            progress: 0,
            config: config as Prisma.InputJsonValue,
        },
    });

    // Start workflow
    const engine = new WorkflowEngine(workflow.id, userId, config);

    try {
        const result = await engine.start();
        return { workflowId: workflow.id, result };
    } catch (error) {
        return { workflowId: workflow.id };
    }
}

/**
 * Get workflow status
 */
export async function getWorkflowStatus(workflowId: string) {
    const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
    });

    if (!workflow) {
        throw new Error("Workflow not found");
    }

    return {
        id: workflow.id,
        status: workflow.status,
        currentStep: workflow.current_step,
        progress: workflow.progress,
        result: workflow.result,
        error: workflow.error,
        createdAt: workflow.created_at,
        startedAt: workflow.started_at,
        completedAt: workflow.completed_at,
    };
}
