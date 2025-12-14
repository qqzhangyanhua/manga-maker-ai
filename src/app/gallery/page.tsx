"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { GalleryContent } from "./components/GalleryContent";

function GalleryLoading(): JSX.Element {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">作品画廊</h1>
        <p className="text-muted-foreground">
          探索社区创作的精彩漫画作品，鼠标悬停查看生成提示词
        </p>
      </div>
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  );
}

export default function GalleryPage(): JSX.Element {
  return (
    <Suspense fallback={<GalleryLoading />}>
      <GalleryContent />
    </Suspense>
  );
}
