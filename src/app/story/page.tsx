import { prisma } from "@/lib/db";
import { StoryPageClient, StoryPageComicStyle } from "./story-page-client";

export const dynamic = "force-dynamic";

async function getInitialComicStyles(): Promise<StoryPageComicStyle[]> {
  const styles = await prisma.comicStyle.findMany({
    where: { enabled: true },
    orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
    select: {
      id: true,
      style_key: true,
      name_zh: true,
      name_en: true,
      image_url: true,
      tag_color: true,
      description: true,
    },
  });

  return styles;
}

export default async function StoryPage() {
  const initialComicStyles = await getInitialComicStyles();
  return <StoryPageClient initialComicStyles={initialComicStyles} />;
}
