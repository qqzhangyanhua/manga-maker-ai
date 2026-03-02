import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import GeneratedGalleryPageClient, {
  GeneratedImageItem,
  GeneratedPagination,
} from "./generated-page-client";

export const dynamic = "force-dynamic";

const LIMIT = 20;
const PAGE = 1;

async function getInitialGeneratedData(): Promise<{
  images: GeneratedImageItem[];
  pagination: GeneratedPagination | null;
}> {
  const user = await getCurrentUser();
  if (!user?.userId) {
    return { images: [], pagination: null };
  }

  const where = { user_id: user.userId };
  const [imagesRaw, total] = await Promise.all([
    prisma.generatedImage.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (PAGE - 1) * LIMIT,
      take: LIMIT,
      select: {
        id: true,
        image_url: true,
        prompt: true,
        style: true,
        source_type: true,
        source_id: true,
        character_id: true,
        created_at: true,
      },
    }),
    prisma.generatedImage.count({ where }),
  ]);

  const images: GeneratedImageItem[] = imagesRaw.map((img) => ({
    id: img.id,
    image_url: img.image_url,
    prompt: img.prompt,
    style: img.style,
    source_type: img.source_type,
    source_id: img.source_id,
    character_id: img.character_id,
    created_at: img.created_at.toISOString(),
  }));

  const pagination: GeneratedPagination = {
    page: PAGE,
    limit: LIMIT,
    total,
    totalPages: Math.ceil(total / LIMIT),
  };

  return { images, pagination };
}

export default async function GeneratedGalleryPage() {
  const initialData = await getInitialGeneratedData();

  return (
    <GeneratedGalleryPageClient
      initialImages={initialData.images}
      initialPagination={initialData.pagination}
    />
  );
}
