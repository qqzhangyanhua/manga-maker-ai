import { Project } from "./types";
import { ProjectCard } from "./project-card";
import { ProjectEmptyState } from "./empty-state";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectListProps {
  projects: Project[];
  loading: boolean;
}

export function ProjectList({ projects, loading }: ProjectListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[280px] rounded-xl bg-zinc-900/30 border border-zinc-800/50 p-4 space-y-4 animate-pulse">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-zinc-800 rounded-lg" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-1/2 bg-zinc-800 rounded" />
                <div className="h-3 w-1/3 bg-zinc-800/60 rounded" />
              </div>
            </div>
            <div className="h-20 bg-zinc-800/30 rounded" />
            <div className="h-8 w-full bg-zinc-800/30 rounded mt-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return <ProjectEmptyState />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
