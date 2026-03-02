import { Navbar } from "@/components/Landing";
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";
import { Project } from "@/components/projects/types";
import { ProjectsPageClient } from "./projects-page-client";

export const dynamic = "force-dynamic";

async function getInitialProjects(): Promise<Project[]> {
  const user = await getCurrentUser();
  if (!user?.userId) {
    return [];
  }

  const projects = await prisma.project.findMany({
    where: { user_id: user.userId },
    include: {
      panels: {
        select: {
          id: true,
          generated_image: true,
          created_at: true,
        },
      },
    },
    orderBy: {
      updated_at: "desc",
    },
  });

  return projects.map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    style: project.style,
    status: project.status,
    created_at: project.created_at.toISOString(),
    updated_at: project.updated_at.toISOString(),
    cover_image: project.cover_image,
    panels: project.panels.map((panel) => ({
      id: panel.id,
      generated_image: panel.generated_image,
      created_at: panel.created_at.toISOString(),
    })),
  }));
}

export default async function ProjectListPage() {
  const initialProjects = await getInitialProjects();

  return (
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
      <Navbar />

      <div className="fixed top-0 left-0 w-full h-[500px] bg-orange-500/5 blur-[120px] pointer-events-none select-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] pointer-events-none select-none" />

      <main className="pt-24 px-4 sm:px-6 lg:px-8 pb-16 relative z-10">
        <div className="max-w-[1400px] mx-auto">
          <PageBreadcrumb segments={[{ label: "分镜项目" }]} className="mb-4" />
          <ProjectsPageClient initialProjects={initialProjects} />
        </div>
      </main>
    </div>
  );
}
