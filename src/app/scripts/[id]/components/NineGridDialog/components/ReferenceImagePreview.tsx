/**
 * Reference image preview component
 */

import type { CharacterAsset } from "../types";

interface ReferenceImagePreviewProps {
    assetId: string;
    assets: CharacterAsset[];
}

export function ReferenceImagePreview({ assetId, assets }: ReferenceImagePreviewProps) {
    const selectedAsset = assets.find((a) => a.id === assetId);

    if (!selectedAsset) {
        return null;
    }

    return (
        <div className="mt-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
                {selectedAsset.base_image_url && (
                    <img
                        src={selectedAsset.base_image_url}
                        alt={selectedAsset.name}
                        className="w-16 h-16 rounded object-cover"
                    />
                )}
                <div>
                    <div className="font-medium">{selectedAsset.name}</div>
                    {selectedAsset.comic_style && (
                        <div className="text-sm text-muted-foreground">
                            风格：{selectedAsset.comic_style.name_zh}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
