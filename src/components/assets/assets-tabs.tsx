import { Users, Box, MapPin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface AssetsTabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

export function AssetsTabs({ value, onValueChange, children }: AssetsTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full space-y-8">
      <div className="sticky top-20 z-20 backdrop-blur-xl bg-background/50 py-2 -mx-4 px-4 md:static md:bg-transparent md:p-0">
        <TabsList className="w-full max-w-md mx-auto grid grid-cols-3 h-12 p-1 bg-zinc-900/80 border border-zinc-800 rounded-xl shadow-xl shadow-black/20">
          <TabsTrigger
            value="characters"
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-300",
              "data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/25",
              "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            )}
          >
            <Users className="w-4 h-4" />
            <span>角色</span>
          </TabsTrigger>
          <TabsTrigger
            value="poses"
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-300",
              "data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/25",
              "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            )}
          >
            <Box className="w-4 h-4" />
            <span>姿势</span>
          </TabsTrigger>
          <TabsTrigger
            value="scenes"
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-300",
              "data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/25",
              "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            )}
          >
            <MapPin className="w-4 h-4" />
            <span>场景</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="relative min-h-[500px]">
        {children}
      </div>
    </Tabs>
  );
}
