/**
 * Nine-grid generation form view
 */

"use client";

import { UseFormReturn } from "react-hook-form";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Info, Grid3x3, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GenerationModeSelector } from "./GenerationModeSelector";
import { PlotSummaryInput } from "./PlotSummaryInput";
import { StyleAndReferenceSelectors } from "./StyleAndReferenceSelectors";
import { PanelSelector } from "./PanelSelector";
import { useNineGridStore } from "../store/useNineGridStore";
import type { FormData, Chapter, GenerationStep } from "../types";

interface NineGridFormViewProps {
    form: UseFormReturn<FormData>;
    chapters: Chapter[];
    onSubmit: (data: FormData) => void;
    onCancel: () => void;
    generationStep?: GenerationStep | null;
}

export function NineGridFormView({
    form,
    chapters,
    onSubmit,
    onCancel,
    generationStep,
}: NineGridFormViewProps) {
    const { toast } = useToast();
    const {
        chapterPanels,
        selectedPanelIds,
        isLoadingPanels,
        comicStyles,
        characterAssets,
        isLoadingStyles,
        isLoadingAssets,
        isGenerating,
        selectedChapterId,
        togglePanel,
        selectFirst9,
        clearSelection,
    } = useNineGridStore();

    const currentMode = form.watch("mode");

    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Grid3x3 className="w-5 h-5 text-orange-500" />
                    九宫格图片生成
                </DialogTitle>
                <DialogDescription>
                    选择 9 个分镜，生成 1 张 3×3 九宫格布局的图片
                </DialogDescription>
            </DialogHeader>

            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex-1 flex flex-col overflow-hidden"
                >
                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-6">
                            {/* Info Alert */}
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription className="text-sm">
                                    九宫格图片将 9 个分镜组合成一张 3×3 布局的图片，展现连续的视觉叙事。
                                    {currentMode === "from-panels"
                                        ? "选择的分镜将按顺序排列（从左到右，从上到下）。"
                                        : "AI 将根据剧情自动生成 9 个连续的分镜并合成九宫格图片。"}
                                </AlertDescription>
                            </Alert>

                            {/* Generation Progress */}
                            {generationStep && (
                                <Alert className="border-orange-500 bg-orange-50/50 dark:bg-orange-950/20">
                                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                                    <AlertDescription>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span>{generationStep.message}</span>
                                                <span className="text-orange-600 font-medium">
                                                    步骤 {generationStep.current ?? 0}/{generationStep.total}
                                                </span>
                                            </div>
                                            <Progress
                                                value={generationStep.current ? (generationStep.current / generationStep.total) * 100 : 0}
                                                className="h-2"
                                            />
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Mode Selector */}
                            <FormField
                                control={form.control}
                                name="mode"
                                render={({ field }) => (
                                    <FormItem>
                                        <GenerationModeSelector
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Chapter Selector */}
                            <FormField
                                control={form.control}
                                name="chapterId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>选择章节 *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="选择章节" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {chapters.map((chapter) => (
                                                    <SelectItem key={chapter.id} value={chapter.id}>
                                                        第 {chapter.chapter_order} 章 - {chapter.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            {currentMode === "from-panels"
                                                ? "选择包含分镜的章节"
                                                : "选择要生成九宫格的章节"}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Plot Summary Input (from-plot mode) */}
                            {currentMode === "from-plot" && (
                                <PlotSummaryInput control={form.control} />
                            )}

                            {/* Panel Selector (from-panels mode) */}
                            {currentMode === "from-panels" && selectedChapterId && (
                                <PanelSelector
                                    panels={chapterPanels}
                                    selectedPanelIds={selectedPanelIds}
                                    isLoading={isLoadingPanels}
                                    onPanelToggle={togglePanel}
                                    onSelectFirst9={() => selectFirst9(toast)}
                                    onClearSelection={clearSelection}
                                />
                            )}

                            {/* Style and Reference Selectors */}
                            <StyleAndReferenceSelectors
                                control={form.control}
                                comicStyles={comicStyles}
                                characterAssets={characterAssets}
                                isLoadingStyles={isLoadingStyles}
                                isLoadingAssets={isLoadingAssets}
                            />
                        </div>
                    </ScrollArea>

                    <DialogFooter className="mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isGenerating}
                        >
                            取消
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                isGenerating ||
                                (currentMode === "from-panels" && selectedPanelIds.length !== 9) ||
                                (currentMode === "from-plot" && !form.watch("plotSummary")?.trim())
                            }
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {generationStep?.message || "生成中..."}
                                </>
                            ) : (
                                <>
                                    <Grid3x3 className="mr-2 h-4 w-4" />
                                    生成九宫格图片
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </>
    );
}
