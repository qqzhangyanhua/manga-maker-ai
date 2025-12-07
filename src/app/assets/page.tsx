"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Box, MapPin, ArrowLeft } from "lucide-react";
import CharacterLibrary from "@/components/AssetLibrary/CharacterLibrary";
import SceneLibrary from "@/components/AssetLibrary/SceneLibrary";
import PoseLabEditor from "@/components/PoseLab/PoseLabEditor";

const AssetLibraryPage = () => {
  const [activeTab, setActiveTab] = useState("characters");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>

          <div className="text-center mb-10">
            <h1 className="font-comic text-4xl md:text-5xl comic-title mb-4">
              资产管理系统
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              管理你的角色、姿势和场景资产，保持创作的一致性
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full max-w-md mx-auto grid grid-cols-3 mb-8 h-auto p-1 bg-muted">
              <TabsTrigger 
                value="characters" 
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">角色库</span>
              </TabsTrigger>
              <TabsTrigger 
                value="poses"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Box className="w-4 h-4" />
                <span className="hidden sm:inline">姿势库</span>
              </TabsTrigger>
              <TabsTrigger 
                value="scenes"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">场景库</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="characters" className="mt-0">
              <CharacterLibrary />
            </TabsContent>

            <TabsContent value="poses" className="mt-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-comic text-2xl text-foreground">3D 姿态辅助库</h2>
                    <p className="text-muted-foreground">
                      使用 3D 人偶编辑器摆出精确的姿势，解决 AI 难以绘制的透视和动态问题
                    </p>
                  </div>
                </div>
                <div className="min-h-[600px]">
                  <PoseLabEditor />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="scenes" className="mt-0">
              <SceneLibrary />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AssetLibraryPage;
