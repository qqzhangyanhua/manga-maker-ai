"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiModifyPanel } from "./components/AiModifyPanel";
import { EditControls } from "./components/EditControls";
import { ImagePreview } from "./components/ImagePreview";
import { useImageEditor } from "./hooks/useImageEditor";

export default function ImageEditorPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("edit");
  const {
    panel,
    loading,
    saving,
    aiModifying,
    applyingEdit,
    currentImage,
    imageVersion,
    imageBox,
    previewRef,
    modifyPrompt,
    setModifyPrompt,
    rotation,
    filters,
    crop,
    bubble,
    hasPendingEdit,
    handleSave,
    handleAIModify,
    handleApplyEdit,
    handleResetEdit,
    handleResetToOriginal,
    updateRotation,
    updateCrop,
    updateFilter,
    updateBubble,
    startBubbleDrag,
    filterString,
  } = useImageEditor();

  if (loading) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!panel || !currentImage) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold">未找到图片</h1>
        <Button className="mt-4" onClick={() => router.back()}>
          返回
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">编辑面板 #{panel.panel_order}</h1>
            <p className="text-sm text-muted-foreground">{panel.description || "无描述"}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          保存
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <ImagePreview
            currentImage={currentImage}
            imageVersion={imageVersion}
            activeTab={activeTab}
            filterString={filterString}
            rotation={rotation}
            previewRef={previewRef}
            imageBox={imageBox}
            crop={crop}
            bubble={bubble}
            startBubbleDrag={startBubbleDrag}
          />
          <p className="text-sm text-muted-foreground text-center">
            {activeTab === "edit" ? "实时预览（未保存）" : "当前图片预览"}
          </p>
        </div>

        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">基础编辑</TabsTrigger>
              <TabsTrigger value="ai">AI修改</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4 mt-4">
              <EditControls
                crop={crop}
                rotation={rotation}
                filters={filters}
                bubble={bubble}
                hasPendingEdit={hasPendingEdit}
                applyingEdit={applyingEdit}
                currentImage={currentImage}
                updateCrop={updateCrop}
                updateFilter={updateFilter}
                updateBubble={updateBubble}
                updateRotation={updateRotation}
                handleApplyEdit={handleApplyEdit}
                handleResetEdit={handleResetEdit}
                handleResetToOriginal={handleResetToOriginal}
              />
            </TabsContent>

            <TabsContent value="ai" className="space-y-4 mt-4">
              <AiModifyPanel
                modifyPrompt={modifyPrompt}
                setModifyPrompt={setModifyPrompt}
                aiModifying={aiModifying}
                handleAIModify={handleAIModify}
                panel={panel}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
