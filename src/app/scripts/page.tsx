import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { ScriptsListStory, ScriptsPageClient } from "./scripts-page-client";

export const dynamic = "force-dynamic";

async function getInitialStories(): Promise<ScriptsListStory[]> {
  const user = await getCurrentUser();
  if (!user?.userId) {
    return [];
  }

  const stories = await prisma.story.findMany({
    where: { user_id: user.userId },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      genre: true,
      premise: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });

  return stories.map((story) => ({
    id: story.id,
    title: story.title,
    genre: story.genre,
    premise: story.premise,
    status: story.status,
    created_at: story.created_at.toISOString(),
    updated_at: story.updated_at.toISOString(),
  }));
}

export default async function ScriptsPage() {
  const initialStories = await getInitialStories();
  return <ScriptsPageClient initialStories={initialStories} />;
}
