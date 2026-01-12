/**
 * Style and reference image selectors component
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Palette, Image as ImageIcon } from "lucide-react";
import { ReferenceImagePreview } from "./ReferenceImagePreview";
import type { FormData, ComicStyle, CharacterAsset } from "../types";

interface StyleAndReferenceSelectorsProps {
    control: Control<FormData>;
    comicStyles: ComicStyle[];
    characterAssets: CharacterAsset[];
    isLoadingStyles: boolean;
    isLoadingAssets: boolean;
}

export function StyleAndReferenceSelectors({
    control,
    comicStyles,
    characterAssets,
    isLoadingStyles,
    isLoadingAssets,
}: StyleAndReferenceSelectorsProps) {
    return (
        <>
            {/* Comic Style Selector */}
            <FormField
                control={control}
                name="comicStyleId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center gap-2">
                            <Palette className="w-4 h-4" />
                            漫画风格（可选）
                        </FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoadingStyles}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue
                                        placeholder={
                                            isLoadingStyles ? "加载中..." : "选择漫画风格"
                                        }
                                    />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="none">不指定风格</SelectItem>
                                {comicStyles.map((style) => (
                                    <SelectItem key={style.id} value={style.id}>
                                        {style.name_zh} ({style.name_en})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            选择漫画风格将影响九宫格图片的整体视觉风格
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Reference Image Selector */}
            <FormField
                control={control}
                name="referenceImageId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            参考图（可选）
                        </FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoadingAssets}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue
                                        placeholder={
                                            isLoadingAssets ? "加载中..." : "从素材库选择参考图"
                                        }
                                    />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="none">不使用参考图</SelectItem>
                                {characterAssets.map((asset) => (
                                    <SelectItem key={asset.id} value={asset.id}>
                                        {asset.name}
                                        {asset.comic_style && ` - ${asset.comic_style.name_zh}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            选择素材库中的角色作为参考图，保持视觉一致性
                        </FormDescription>
                        <FormMessage />

                        {/* Reference Image Preview */}
                        {field.value && field.value !== "none" && (
                            <ReferenceImagePreview
                                assetId={field.value}
                                assets={characterAssets}
                            />
                        )}
                    </FormItem>
                )}
            />
        </>
    );
}
