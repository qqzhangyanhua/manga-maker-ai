/**
 * Plot summary input component
 */

"use client";

import { Control } from "react-hook-form";
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import type { FormData } from "../types";

interface PlotSummaryInputProps {
    control: Control<FormData>;
}

export function PlotSummaryInput({ control }: PlotSummaryInputProps) {
    return (
        <FormField
            control={control}
            name="plotSummary"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>剧情概述 *</FormLabel>
                    <FormControl>
                        <Textarea
                            {...field}
                            placeholder="请输入剧情概述，例如：一个年轻的剑客在森林中遇到了神秘的老人，老人传授给他失传已久的剑法。剑客从怀疑到信任，最终领悟了剑法的真谛。"
                            className="min-h-[120px] resize-none"
                        />
                    </FormControl>
                    <FormDescription>
                        描述你想要展现的故事情节，AI 将生成 9 个连续的分镜
                    </FormDescription>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
