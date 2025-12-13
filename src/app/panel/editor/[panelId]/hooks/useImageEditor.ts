"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { applyEditsToImage } from "../image-edit-utils";
import {
  BubbleOptions,
  DEFAULT_BUBBLE,
  DEFAULT_CROP,
  DEFAULT_FILTERS,
  FilterOptions,
  ImageBox,
  ImageSize,
  Panel,
  CropArea,
} from "../types";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeCrop(area: CropArea): CropArea {
  const minSize = 10;
  const safeX = clamp(area.x, 0, 100 - minSize);
  const safeY = clamp(area.y, 0, 100 - minSize);
  const safeWidth = clamp(area.width, minSize, 100 - safeX);
  const safeHeight = clamp(area.height, minSize, 100 - safeY);
  return {
    x: safeX,
    y: safeY,
    width: safeWidth,
    height: safeHeight,
  };
}

export function useImageEditor() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const panelId = params.panelId as string;
  const previewRef = useRef<HTMLDivElement | null>(null);

  const [panel, setPanel] = useState<Panel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiModifying, setAiModifying] = useState(false);
  const [applyingEdit, setApplyingEdit] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [imageVersion, setImageVersion] = useState(0);
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [imageBox, setImageBox] = useState<ImageBox | null>(null);
  const [modifyPrompt, setModifyPrompt] = useState("");
  const [rotation, setRotation] = useState(0);
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [crop, setCrop] = useState<CropArea>(DEFAULT_CROP);
  const [bubble, setBubble] = useState<BubbleOptions>(DEFAULT_BUBBLE);
  const [hasPendingEdit, setHasPendingEdit] = useState(false);
  const [dragState, setDragState] = useState<{
    mode: "move" | "resize";
    startX: number;
    startY: number;
    boxWidth: number;
    boxHeight: number;
    startBubble: BubbleOptions;
  } | null>(null);

  useEffect(() => {
    async function loadPanel() {
      try {
        const response = await fetch(`/api/panel/${panelId}`);
        if (!response.ok) {
          throw new Error("Failed to load panel");
        }
        const data = await response.json();
        const initialImage = data.generated_image || data.image_url;
        setPanel(data);
        setCurrentImage(initialImage);
        setOriginalImage(initialImage);
        setBubble((prev) => ({
          ...prev,
          text: data.dialogue || prev.text,
        }));
      } catch (error) {
        toast({
          title: "加载失败",
          description: error instanceof Error ? error.message : "无法加载面板数据",
          variant: "destructive",
        });
        router.back();
      } finally {
        setLoading(false);
      }
    }

    loadPanel();
  }, [panelId, router, toast]);

  useEffect(() => {
    if (!currentImage || typeof window === "undefined") return;

    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = currentImage;
    img.onload = () => {
      if (!cancelled) {
        setImageSize({
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        });
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        setImageSize(null);
      }
    };

    return () => {
      cancelled = true;
    };
  }, [currentImage]);

  const recomputeImageBox = useCallback(() => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    if (!imageSize) {
      setImageBox({
        width: rect.width,
        height: rect.height,
        offsetLeft: 0,
        offsetTop: 0,
      });
      return;
    }

    const containerRatio = rect.width / rect.height;
    const imageRatio = imageSize.width / imageSize.height;

    if (imageRatio > containerRatio) {
      const width = rect.width;
      const height = width / imageRatio;
      setImageBox({
        width,
        height,
        offsetLeft: 0,
        offsetTop: (rect.height - height) / 2,
      });
    } else {
      const height = rect.height;
      const width = height * imageRatio;
      setImageBox({
        width,
        height,
        offsetLeft: (rect.width - width) / 2,
        offsetTop: 0,
      });
    }
  }, [imageSize]);

  useEffect(() => {
    recomputeImageBox();
    window.addEventListener("resize", recomputeImageBox);
    return () => window.removeEventListener("resize", recomputeImageBox);
  }, [recomputeImageBox, currentImage, imageVersion]);

  const clampBubblePosition = useCallback((options: BubbleOptions) => {
    const tailFactor = options.style === "pointer" ? 1.2 : 1;
    const effectiveHeight = options.height * tailFactor;
    const halfWidth = Math.min(options.width / 2, 50);
    const halfHeight = Math.min(effectiveHeight / 2, 50);
    return {
      ...options,
      x: clamp(options.x, halfWidth, 100 - halfWidth),
      y: clamp(options.y, halfHeight, 100 - halfHeight),
      width: clamp(options.width, 10, 100),
      height: clamp(options.height, 10, options.style === "pointer" ? 80 : 100),
    };
  }, []);

  function markPending() {
    setHasPendingEdit(true);
  }

  function updateRotation(value: number) {
    setRotation(value);
    markPending();
  }

  function updateCrop(key: keyof CropArea, value: number) {
    setCrop((prev) => normalizeCrop({ ...prev, [key]: value }));
    markPending();
  }

  function updateFilter(key: keyof FilterOptions, value: number) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    markPending();
  }

  function updateBubble<K extends keyof BubbleOptions>(key: K, value: BubbleOptions[K]) {
    setBubble((prev) => clampBubblePosition({ ...prev, [key]: value }));
    markPending();
  }

  function startBubbleDrag(mode: "move" | "resize", clientX: number, clientY: number) {
    if (!previewRef.current || !imageBox) return;
    setDragState({
      mode,
      startX: clientX,
      startY: clientY,
      boxWidth: imageBox.width,
      boxHeight: imageBox.height,
      startBubble: bubble,
    });
  }

  useEffect(() => {
    if (!dragState) return;

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault();
      const dxPercent = dragState.boxWidth
        ? ((event.clientX - dragState.startX) / dragState.boxWidth) * 100
        : 0;
      const dyPercent = dragState.boxHeight
        ? ((event.clientY - dragState.startY) / dragState.boxHeight) * 100
        : 0;

      if (dragState.mode === "move") {
        setBubble(
          clampBubblePosition({
            ...dragState.startBubble,
            x: dragState.startBubble.x + dxPercent,
            y: dragState.startBubble.y + dyPercent,
          }),
        );
      } else {
        setBubble(
          clampBubblePosition({
            ...dragState.startBubble,
            width: dragState.startBubble.width + dxPercent,
            height: dragState.startBubble.height + dyPercent,
          }),
        );
      }

      if (!hasPendingEdit) {
        setHasPendingEdit(true);
      }
    }

    function handlePointerUp() {
      setDragState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [clampBubblePosition, dragState, hasPendingEdit]);

  async function handleAIModify() {
    if (!modifyPrompt.trim()) {
      toast({
        title: "请输入修改描述",
        description: "告诉AI你想要如何修改这张图片",
        variant: "destructive",
      });
      return;
    }

    if (!currentImage) {
      toast({
        title: "没有可编辑的图片",
        variant: "destructive",
      });
      return;
    }

    setAiModifying(true);
    try {
      const response = await fetch(`/api/panel/${panelId}/ai-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: currentImage,
          modifyPrompt: modifyPrompt.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "AI修改失败");
      }

      const data = await response.json();
      setCurrentImage(data.imageUrl);
      setImageVersion((v) => v + 1);
      toast({
        title: "AI修改成功",
        description: "图片已更新，记得保存",
      });
      setModifyPrompt("");
    } catch (error) {
      toast({
        title: "AI修改失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setAiModifying(false);
    }
  }

  async function handleSave() {
    if (hasPendingEdit) {
      toast({
        title: "请先应用基础编辑",
        description: "点击「应用到图片」后再保存，避免丢失调整",
        variant: "destructive",
      });
      return;
    }

    if (!currentImage) {
      toast({
        title: "没有可保存的图片",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      let imageUrlToSave = currentImage;

      // 如果是 base64 图片，先上传到 MinIO
      if (currentImage.startsWith("data:")) {
        toast({
          title: "正在上传图片",
          description: "请稍候...",
        });

        const uploadResponse = await fetch("/api/upload/base64", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data: currentImage,
            filename: `panel-${panelId}-${Date.now()}.png`,
          }),
        });

        if (!uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          throw new Error(uploadData.error || "图片上传失败");
        }

        const uploadData = await uploadResponse.json();
        imageUrlToSave = uploadData.url;
      }

      // 保存图片 URL 到数据库
      const response = await fetch(`/api/panel/${panelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generated_image: imageUrlToSave,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "保存失败");
      }

      toast({
        title: "保存成功",
        description: "图片已更新",
      });
      router.back();
    } catch (error) {
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleApplyEdit() {
    if (!currentImage) {
      toast({
        title: "没有可编辑的图片",
        variant: "destructive",
      });
      return;
    }

    setApplyingEdit(true);
    try {
      const editedImage = await applyEditsToImage(currentImage, {
        rotation,
        filters,
        crop,
        bubble,
      });

      setCurrentImage(editedImage);
      setImageVersion((v) => v + 1);
      setRotation(0);
      setFilters(DEFAULT_FILTERS);
      setCrop(DEFAULT_CROP);
      setBubble((prev) => ({ ...DEFAULT_BUBBLE, text: prev.text, show: false }));
      setHasPendingEdit(false);
      toast({
        title: "基础编辑已应用",
        description: "图像已更新，记得保存或继续微调",
      });
    } catch (error) {
      toast({
        title: "应用失败",
        description:
          error instanceof Error ? error.message : "无法生成编辑后的图片，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setApplyingEdit(false);
    }
  }

  function handleResetEdit() {
    setRotation(0);
    setFilters(DEFAULT_FILTERS);
    setCrop(DEFAULT_CROP);
    setBubble((prev) => ({ ...DEFAULT_BUBBLE, text: prev.text }));
    setHasPendingEdit(false);
  }

  function handleResetToOriginal() {
    if (originalImage) {
      setCurrentImage(originalImage);
      setImageVersion((v) => v + 1);
      setHasPendingEdit(false);
      toast({
        title: "已恢复原图",
        description: "基础编辑参数已重置",
      });
    }
    handleResetEdit();
  }

  const filterString = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) grayscale(${filters.grayscale}%) blur(${filters.blur}px)`;

  return {
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
  };
}
