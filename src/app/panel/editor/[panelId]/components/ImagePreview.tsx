import { RefObject } from "react";
import NextImage from "next/image";
import { hexToRgba } from "../image-edit-utils";
import { BubbleOptions, CropArea, ImageBox } from "../types";

interface ImagePreviewProps {
  currentImage: string | null;
  imageVersion: number;
  activeTab: string;
  filterString: string;
  rotation: number;
  previewRef: RefObject<HTMLDivElement>;
  imageBox: ImageBox | null;
  crop: CropArea;
  bubble: BubbleOptions;
  startBubbleDrag: (mode: "move" | "resize", clientX: number, clientY: number) => void;
}

export function ImagePreview({
  currentImage,
  imageVersion,
  activeTab,
  filterString,
  rotation,
  previewRef,
  imageBox,
  crop,
  bubble,
  startBubbleDrag,
}: ImagePreviewProps) {
  const overlayStyle = imageBox
    ? {
        left: imageBox.offsetLeft,
        top: imageBox.offsetTop,
        width: imageBox.width,
        height: imageBox.height,
      }
    : undefined;

  return (
    <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden border">
      {currentImage && (
        <div className="relative w-full h-full" ref={previewRef}>
          <NextImage
            key={`${currentImage}-${imageVersion}`}
            src={currentImage}
            alt="Current image"
            fill
            className="object-contain transition"
            style={{
              filter: activeTab === "edit" ? filterString : undefined,
              transform: activeTab === "edit" ? `rotate(${rotation}deg)` : undefined,
            }}
            sizes="(max-width: 1024px) 100vw, 66vw"
            unoptimized={currentImage.startsWith("data:")}
          />

          {activeTab === "edit" && overlayStyle && (
            <div
              className="absolute"
              style={{
                ...overlayStyle,
                pointerEvents: "none",
              }}
            >
              <div className="relative w-full h-full">
                <div
                  className="absolute border-2 border-primary/80 rounded-md pointer-events-none transition-all"
                  style={{
                    left: `${crop.x}%`,
                    top: `${crop.y}%`,
                    width: `${crop.width}%`,
                    height: `${crop.height}%`,
                  }}
                />
                {bubble.show && bubble.text.trim() && (
                  <div
                    className="absolute group"
                    style={{
                      left: `${bubble.x}%`,
                      top: `${bubble.y}%`,
                      transform: "translate(-50%, -50%)",
                      width: `${bubble.width}%`,
                      height: `${bubble.height}%`,
                      minHeight: "60px",
                      pointerEvents: "auto",
                    }}
                  >
                    <div
                      className="relative w-full h-full cursor-grab active:cursor-grabbing select-none"
                      onPointerDown={(event) => {
                        if (event.button !== 0) return;
                        event.preventDefault();
                        startBubbleDrag("move", event.clientX, event.clientY);
                      }}
                    >
                      <div
                        className="absolute inset-0 border border-primary/30 rounded-md pointer-events-none"
                        style={{
                          borderRadius:
                            bubble.style === "oval"
                              ? "999px"
                              : bubble.style === "cloud"
                                ? "40% / 60%"
                                : bubble.style === "pointer"
                                  ? "18px"
                                  : "14px",
                        }}
                      />
                      <div
                        className="relative w-full h-full shadow-md"
                        style={{
                          backgroundColor: hexToRgba(bubble.background, bubble.opacity),
                          color: bubble.color,
                          padding: `${bubble.padding}px`,
                          fontSize: `${bubble.fontSize}px`,
                          borderRadius:
                            bubble.style === "oval"
                              ? "999px"
                              : bubble.style === "cloud"
                                ? "40% / 60%"
                                : bubble.style === "pointer"
                                  ? "18px"
                                  : "14px",
                          boxShadow:
                            bubble.style === "cloud"
                              ? "0 6px 18px rgba(0,0,0,0.12)"
                              : "0 4px 10px rgba(0,0,0,0.12)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          overflow: bubble.style === "pointer" ? "visible" : "hidden",
                          wordBreak: "break-word",
                          fontFamily: bubble.fontFamily,
                          clipPath:
                            bubble.style === "pointer"
                              ? "polygon(5% 6%,95% 6%,95% 68%,78% 68%,70% 94%,62% 68%,5% 68%)"
                              : undefined,
                        }}
                      >
                        {bubble.text.split("\n").map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
                      {bubble.style === "pointer" && (
                        <div
                          className="absolute"
                          style={{
                            left: "60%",
                            bottom: "-18%",
                            transform: "translateX(-50%)",
                            width: 0,
                            height: 0,
                            borderLeft: "10px solid transparent",
                            borderRight: "10px solid transparent",
                            borderTop: `16px solid ${hexToRgba(bubble.background, bubble.opacity)}`,
                            pointerEvents: "none",
                          }}
                        />
                      )}
                      <div
                        className="absolute w-3 h-3 bg-primary rounded-sm border border-white shadow-sm cursor-nesw-resize opacity-0 group-hover:opacity-100"
                        style={{ right: -6, bottom: -6 }}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          if (event.button !== 0) return;
                          event.preventDefault();
                          startBubbleDrag("resize", event.clientX, event.clientY);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
