/**
 * Unified Image Generation - Queue management and unified interface
 */

import { callImageGenerationByType } from "./image-generation";

export type ImageGenerationType = "panel" | "expression" | "outfit" | "character" | "scene";

export interface ImageGenerationTask {
    id: string;
    type: ImageGenerationType;
    prompt: string;
    style?: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    cfg?: number;
    seed?: number;
    userId: string;
    metadata?: Record<string, any>;
}

export interface TaskStatus {
    id: string;
    status: "pending" | "processing" | "completed" | "failed";
    progress: number; // 0-100
    imageUrl?: string;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
}

class ImageGenerationQueue {
    private tasks: Map<string, TaskStatus> = new Map();
    private processing: Set<string> = new Set();
    private maxConcurrent: number = 3; // Max concurrent generations
    private queue: ImageGenerationTask[] = [];

    /**
     * Add a task to the queue
     */
    async addTask(task: ImageGenerationTask): Promise<string> {
        const taskId = task.id || this.generateTaskId();

        this.tasks.set(taskId, {
            id: taskId,
            status: "pending",
            progress: 0,
        });

        this.queue.push({ ...task, id: taskId });

        // Start processing if not at max capacity
        this.processQueue();

        return taskId;
    }

    /**
     * Get task status
     */
    getStatus(taskId: string): TaskStatus | undefined {
        return this.tasks.get(taskId);
    }

    /**
     * Cancel a task
     */
    async cancel(taskId: string): Promise<void> {
        const task = this.tasks.get(taskId);
        if (!task) return;

        if (task.status === "pending") {
            // Remove from queue
            this.queue = this.queue.filter((t) => t.id !== taskId);
            this.tasks.set(taskId, {
                ...task,
                status: "failed",
                error: "Cancelled by user",
            });
        } else if (task.status === "processing") {
            // Mark as cancelled (actual cancellation depends on provider)
            this.tasks.set(taskId, {
                ...task,
                status: "failed",
                error: "Cancelled by user",
            });
        }
    }

    /**
     * Process the queue
     */
    private async processQueue(): Promise<void> {
        // Check if we can process more tasks
        if (this.processing.size >= this.maxConcurrent) {
            return;
        }

        // Get next pending task
        const nextTask = this.queue.find(
            (t) => !this.processing.has(t.id) && this.tasks.get(t.id)?.status === "pending"
        );

        if (!nextTask) {
            return;
        }

        // Mark as processing
        this.processing.add(nextTask.id);
        this.tasks.set(nextTask.id, {
            id: nextTask.id,
            status: "processing",
            progress: 10,
            startedAt: new Date(),
        });

        try {
            // Generate image
            const imageUrl = await this.generateImage(nextTask);

            // Mark as completed
            this.tasks.set(nextTask.id, {
                id: nextTask.id,
                status: "completed",
                progress: 100,
                imageUrl,
                completedAt: new Date(),
            });

            // Remove from queue
            this.queue = this.queue.filter((t) => t.id !== nextTask.id);
        } catch (error) {
            console.error(`Image generation failed for task ${nextTask.id}:`, error);

            // Mark as failed
            this.tasks.set(nextTask.id, {
                id: nextTask.id,
                status: "failed",
                progress: 0,
                error: error instanceof Error ? error.message : "Unknown error",
                completedAt: new Date(),
            });
        } finally {
            // Remove from processing set
            this.processing.delete(nextTask.id);

            // Process next task
            this.processQueue();
        }
    }

    /**
     * Generate image using the appropriate provider
     */
    private async generateImage(task: ImageGenerationTask): Promise<string> {
        // Update progress
        this.updateProgress(task.id, 30);

        const result = await callImageGenerationByType({
            providerType: "image_generation",
            prompt: task.prompt,
            negative_prompt: task.negativePrompt,
            width: task.width || 1024,
            height: task.height || 1024,
            steps: task.steps || 30,
            cfg_scale: task.cfg || 7,
            seed: task.seed,
        });

        // Update progress
        this.updateProgress(task.id, 70);

        // Extract image from result
        if (!result.success || !result.images || result.images.length === 0) {
            throw new Error(result.error || "Image generation failed");
        }

        // Upload to MinIO
        try {
            const { base64ToBuffer } = await import("./image-generation");
            const { minioClient, MINIO_BUCKET, ensureBucketExists, getPublicUrl } = await import("./minio");

            // Ensure bucket exists
            await ensureBucketExists();

            // Convert base64 to buffer
            const imageBuffer = base64ToBuffer(result.images[0]);

            // Generate object name
            const timestamp = Date.now();
            const objectName = `generated/${task.userId}/${task.type}/${timestamp}_${task.id}.png`;

            // Upload to MinIO
            await minioClient.putObject(
                MINIO_BUCKET,
                objectName,
                imageBuffer,
                imageBuffer.length,
                { "Content-Type": "image/png" }
            );

            // Update progress
            this.updateProgress(task.id, 90);

            // Return public URL
            const imageUrl = getPublicUrl(objectName);
            return imageUrl;
        } catch (uploadError) {
            console.error("Failed to upload image to MinIO:", uploadError);
            // Fallback: return base64 data URL
            const imageUrl = `data:image/png;base64,${result.images[0]}`;
            return imageUrl;
        }
    }

    /**
     * Update task progress
     */
    private updateProgress(taskId: string, progress: number): void {
        const task = this.tasks.get(taskId);
        if (task) {
            this.tasks.set(taskId, { ...task, progress });
        }
    }

    /**
     * Generate unique task ID
     */
    private generateTaskId(): string {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get queue statistics
     */
    getStats() {
        return {
            total: this.tasks.size,
            pending: Array.from(this.tasks.values()).filter((t) => t.status === "pending").length,
            processing: this.processing.size,
            completed: Array.from(this.tasks.values()).filter((t) => t.status === "completed").length,
            failed: Array.from(this.tasks.values()).filter((t) => t.status === "failed").length,
        };
    }
}

// Singleton instance
let queueInstance: ImageGenerationQueue | null = null;

export function getImageGenerationQueue(): ImageGenerationQueue {
    if (!queueInstance) {
        queueInstance = new ImageGenerationQueue();
    }
    return queueInstance;
}

/**
 * Helper function to generate a single image
 */
export async function generateImage(
    type: ImageGenerationType,
    prompt: string,
    userId: string,
    options?: {
        style?: string;
        negativePrompt?: string;
        width?: number;
        height?: number;
        metadata?: Record<string, any>;
    }
): Promise<{ taskId: string; status: TaskStatus }> {
    const queue = getImageGenerationQueue();

    const taskId = await queue.addTask({
        id: queue["generateTaskId"](),
        type,
        prompt,
        userId,
        style: options?.style,
        negativePrompt: options?.negativePrompt,
        width: options?.width,
        height: options?.height,
        metadata: options?.metadata,
    });

    // Wait a bit for initial processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    const status = queue.getStatus(taskId);

    return {
        taskId,
        status: status || {
            id: taskId,
            status: "pending",
            progress: 0,
        },
    };
}

/**
 * Helper function to generate multiple images in batch
 */
export async function generateImageBatch(
    tasks: Array<{
        type: ImageGenerationType;
        prompt: string;
        userId: string;
        metadata?: Record<string, any>;
    }>
): Promise<string[]> {
    const queue = getImageGenerationQueue();
    const taskIds: string[] = [];

    for (const task of tasks) {
        const taskId = await queue.addTask({
            id: queue["generateTaskId"](),
            type: task.type,
            prompt: task.prompt,
            userId: task.userId,
            metadata: task.metadata,
        });
        taskIds.push(taskId);
    }

    return taskIds;
}

/**
 * Wait for task completion with timeout
 */
export async function waitForTaskCompletion(
    taskId: string,
    timeoutMs: number = 60000
): Promise<TaskStatus> {
    const queue = getImageGenerationQueue();
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
            const status = queue.getStatus(taskId);

            if (!status) {
                clearInterval(checkInterval);
                reject(new Error("Task not found"));
                return;
            }

            if (status.status === "completed" || status.status === "failed") {
                clearInterval(checkInterval);
                resolve(status);
                return;
            }

            if (Date.now() - startTime > timeoutMs) {
                clearInterval(checkInterval);
                reject(new Error("Task timeout"));
            }
        }, 500);
    });
}
