"use client";

import React, { useState, useEffect } from "react";
import { Clock, Trash2, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
    getStoryHistory,
    deleteStoryHistory,
    type StoryHistoryItem,
} from "@/lib/story-history";

interface StoryHistoryProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: StoryHistoryItem) => void;
}

export function StoryHistory({ isOpen, onClose, onSelect }: StoryHistoryProps) {
    const [history, setHistory] = useState<StoryHistoryItem[]>([]);

    // Load history on mount and when opened
    useEffect(() => {
        if (isOpen) {
            const items = getStoryHistory();
            setHistory(items);
        }
    }, [isOpen]);

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        deleteStoryHistory(id);
        setHistory((prev) => prev.filter((item) => item.id !== id));
    };

    const handleSelect = (item: StoryHistoryItem) => {
        onSelect(item);
        onClose();
    };

    const formatTimeAgo = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "刚刚";
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        return new Date(timestamp).toLocaleDateString();
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        已完成
                    </span>
                );
            case "generating":
                return (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        生成中
                    </span>
                );
            case "draft":
            default:
                return (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        草稿
                    </span>
                );
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div
                className={cn(
                    "fixed top-0 right-0 h-full w-full sm:w-96 bg-zinc-900 border-l border-zinc-700 z-50",
                    "transform transition-transform duration-300 ease-in-out",
                    "shadow-2xl",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-zinc-700">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-orange-500" />
                            <h2 className="text-lg font-semibold text-white">创作历史</h2>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-8 w-8 p-0"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {history.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
                                <p className="text-zinc-400 text-sm">暂无创作历史</p>
                                <p className="text-zinc-500 text-xs mt-1">
                                    开始创作后会自动保存到这里
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleSelect(item)}
                                        className="group relative p-4 rounded-lg border border-zinc-700 hover:border-orange-500/50 bg-zinc-800/50 hover:bg-zinc-800 transition-all cursor-pointer"
                                    >
                                        {/* Title or premise */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="text-sm font-medium text-white line-clamp-1 flex-1">
                                                {item.title || "未命名故事"}
                                            </h3>
                                            {getStatusBadge(item.status)}
                                        </div>

                                        {/* Premise preview */}
                                        <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                                            {item.premise}
                                        </p>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                                                <span>{item.genre || "未分类"}</span>
                                                <span>·</span>
                                                <span>{formatTimeAgo(item.updatedAt)}</span>
                                            </div>

                                            {/* Delete button */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => handleDelete(item.id, e)}
                                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-500"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer tip */}
                    <div className="p-4 border-t border-zinc-700 bg-zinc-900/50">
                        <p className="text-xs text-zinc-500 text-center">
                            最多保存 10 条历史记录
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
