import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export const useStoryIntegration = () => {
  const searchParams = useSearchParams();
  const [storyId, setStoryId] = useState<string | null>(null);
  const [initialScript, setInitialScript] = useState("");
  const { toast } = useToast();

  const fetchStoryContent = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/story/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.story) {
            let content = "";
            if (data.story.outline?.acts) {
              content = data.story.outline.acts
                .map((act: { name: string; summary: string }) => `【${act.name}】\n${act.summary}`)
                .join("\n\n");
            } else {
              content = data.story.premise || "";
            }
            setInitialScript(content);
            toast({
              title: "已加载剧本",
              description: `已自动填入《${data.story.title}》的内容`,
            });
          }
        }
      } catch (e) {
        console.error("Failed to load story", e);
      }
    },
    [toast]
  );

  useEffect(() => {
    const sid = searchParams.get("story_id");
    if (sid) {
      setStoryId(sid);
      fetchStoryContent(sid);
    }
  }, [searchParams, fetchStoryContent]);

  return { storyId, initialScript };
};
