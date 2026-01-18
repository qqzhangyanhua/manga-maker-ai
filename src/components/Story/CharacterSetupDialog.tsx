"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CharacterSetupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storyContext?: string;
    onCharacterCreated?: (character: unknown) => void;
}

export function CharacterSetupDialog({
    open,
    onOpenChange,
    storyContext,
    onCharacterCreated,
}: CharacterSetupDialogProps) {
    const { toast } = useToast();
    const [description, setDescription] = useState("");
    const [generating, setGenerating] = useState(false);

    async function handleGenerate() {
        if (!description.trim()) {
            toast({
                title: "错误",
                description: "请输入角色描述",
                variant: "destructive",
            });
            return;
        }

        setGenerating(true);

        try {
            const res = await fetch("/api/story/character-setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    characterDescription: description,
                    storyContext,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "生成失败");
            }

            toast({
                title: "成功",
                description: data.message,
            });

            if (onCharacterCreated) {
                onCharacterCreated(data.character);
            }

            setDescription("");
            onOpenChange(false);
        } catch (error) {
            console.error("Character setup error:", error);
            const message = error instanceof Error ? error.message : "生成失败";
            toast({
                title: "生成失败",
                description: message,
                variant: "destructive",
            });
        } finally {
            setGenerating(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>生成角色设定</DialogTitle>
                    <DialogDescription>
                        描述你想要的角色,AI将生成详细的角色设定
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="char-description">角色描述 *</Label>
                        <Textarea
                            id="char-description"
                            placeholder="例如: 一个30岁的私家侦探,冷静理智,有轻微的强迫症..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="resize-none"
                        />
                        <p className="text-sm text-muted-foreground">
                            描述角色的外貌、性格、背景等特征
                        </p>
                    </div>

                    {storyContext && (
                        <div className="p-3 bg-muted rounded-md">
                            <p className="text-sm font-medium">故事背景</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {storyContext}
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={generating}
                    >
                        取消
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={!description.trim() || generating}
                    >
                        {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        生成角色设定
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
