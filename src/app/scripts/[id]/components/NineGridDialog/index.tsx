/**
 * Nine-grid image generation dialog (Refactored)
 * Main orchestrator component - under 200 lines
 */

"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useNineGridStore } from "./store/useNineGridStore";
import { useNineGridGeneration } from "./hooks/useNineGridGeneration";
import { NineGridResultView } from "./components/NineGridResultView";
import { NineGridFormView } from "./components/NineGridFormView";
import type { NineGridDialogProps, FormData } from "./types";

// Form validation schema
const formSchema = z.object({
    mode: z.enum(["from-panels", "from-plot"]),
    chapterId: z.string().min(1, "请选择章节"),
    plotSummary: z.string().optional(),
    comicStyleId: z.string().optional(),
    referenceImageId: z.string().optional(),
}).refine((data) => {
    // Plot summary is required for from-plot mode
    if (data.mode === "from-plot") {
        return data.plotSummary && data.plotSummary.trim().length > 0;
    }
    return true;
}, {
    message: "请输入剧情概述",
    path: ["plotSummary"],
});

export function NineGridDialog({
    open,
    onOpenChange,
    projectId,
    chapters,
    onSuccess,
}: NineGridDialogProps) {
    const { toast } = useToast();

    // Zustand store
    const {
        generatedImageUrl,
        generatedPanels,
        selectedChapterId,
        loadStyles,
        loadAssets,
        loadPanels,
        setChapter,
        clearResult,
        reset,
    } = useNineGridStore();

    // Form management
    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            mode: "from-panels",
            chapterId: "",
            plotSummary: "",
            comicStyleId: "none",
            referenceImageId: "none",
        },
    });

    // Generation logic
    const { handleGenerateFromPanels, handleGenerateFromPlot, generationStep } =
        useNineGridGeneration({ projectId, onSuccess });

    // Watch chapter changes
    useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            const newChapterId = value.chapterId;

            if (name === "chapterId" && newChapterId && newChapterId !== selectedChapterId) {
                setChapter(newChapterId);
                loadPanels(newChapterId, toast);
            }
        });

        return () => subscription.unsubscribe();
    }, [form, selectedChapterId, setChapter, loadPanels, toast]);

    // Dialog open/close effects
    useEffect(() => {
        if (open) {
            loadStyles();
            loadAssets();
        } else {
            reset();
            form.reset();
        }
    }, [open, loadStyles, loadAssets, reset, form]);

    // Form submission handler
    const handleSubmit = async (data: FormData) => {
        // Validate project ID
        if (!projectId) {
            toast({
                title: "错误",
                description: "项目 ID 不存在",
                variant: "destructive",
            });
            return;
        }

        // Route to appropriate handler based on mode
        if (data.mode === "from-plot") {
            await handleGenerateFromPlot(data);
        } else {
            await handleGenerateFromPanels(data);
        }
    };

    // Regenerate handler
    const handleRegenerate = () => {
        clearResult();
    };

    // Close handler
    const handleClose = () => {
        reset();
        form.reset();
        onOpenChange(false);
    };

    // Render
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {generatedImageUrl ? (
                    <NineGridResultView
                        imageUrl={generatedImageUrl}
                        panels={generatedPanels || undefined}
                        onRegenerate={handleRegenerate}
                        onClose={handleClose}
                    />
                ) : (
                    <NineGridFormView
                        form={form}
                        chapters={chapters}
                        onSubmit={handleSubmit}
                        onCancel={() => onOpenChange(false)}
                        generationStep={generationStep}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
