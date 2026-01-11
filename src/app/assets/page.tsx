"use client";

import { useState } from "react";
import { Navbar } from "@/components/Landing";
import { TabsContent } from "@/components/ui/tabs";
import { AssetsHeader } from "@/components/assets/assets-header";
import { UsageStats } from "@/components/assets/usage-stats";
import { AssetsTabs } from "@/components/assets/assets-tabs";
import CharacterLibrary from "@/components/AssetLibrary/CharacterLibrary";
import SceneLibrary from "@/components/AssetLibrary/SceneLibrary";
import PoseLabEditor from "@/components/PoseLab/PoseLabEditor";

export default function AssetLibraryPage() {
  const [activeTab, setActiveTab] = useState("characters");

  return (
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
      <Navbar />
      
      {/* 装饰性背景 */}
      <div className="fixed top-0 left-0 w-full h-[500px] bg-orange-500/5 blur-[120px] pointer-events-none select-none" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] pointer-events-none select-none" />

      <main className="pt-24 px-4 sm:px-6 lg:px-8 pb-16 relative z-10">
        <div className="max-w-[1400px] mx-auto">
          <AssetsHeader>
            <UsageStats />
          </AssetsHeader>

          <AssetsTabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="characters" className="mt-0 focus-visible:outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
              <CharacterLibrary />
            </TabsContent>

            <TabsContent value="poses" className="mt-0 focus-visible:outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
              <div className="space-y-6">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-white mb-2">3D 姿态辅助实验室</h2>
                    <p className="text-zinc-400 text-sm">
                      使用 3D 人偶编辑器摆出精确的姿势，解决 AI 难以绘制的透视和动态问题。生成的骨架图可直接用于 ControlNet 控制。
                    </p>
                  </div>
                  <div className="min-h-[600px] bg-black/40 rounded-lg overflow-hidden border border-zinc-800/50">
                    <PoseLabEditor />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="scenes" className="mt-0 focus-visible:outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
              <SceneLibrary />
            </TabsContent>
          </AssetsTabs>
        </div>
      </main>
    </div>
  );
}
