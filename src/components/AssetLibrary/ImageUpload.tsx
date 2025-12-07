"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onUpload: (files: File[]) => void;
  onRemove?: (index: number) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  uploadedUrls?: string[];
  disabled?: boolean;
}

const ImageUpload = ({
  onUpload,
  onRemove,
  maxFiles = 5,
  maxSize = 5,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp"],
  uploadedUrls = [],
  disabled = false,
}: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles || disabled) return;

      const fileArray = Array.from(selectedFiles);
      const totalFiles = files.length + uploadedUrls.length + fileArray.length;

      if (totalFiles > maxFiles) {
        alert(`最多只能上传 ${maxFiles} 张图片`);
        return;
      }

      // 验证文件
      const validFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of fileArray) {
        // 检查文件大小
        if (file.size > maxSize * 1024 * 1024) {
          alert(`文件 ${file.name} 超过 ${maxSize}MB 限制`);
          continue;
        }

        // 检查文件类型
        if (!acceptedTypes.includes(file.type)) {
          alert(`文件 ${file.name} 类型不支持`);
          continue;
        }

        validFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }

      if (validFiles.length > 0) {
        const updatedFiles = [...files, ...validFiles];
        const updatedPreviews = [...previews, ...newPreviews];

        setFiles(updatedFiles);
        setPreviews(updatedPreviews);
        onUpload(updatedFiles);
      }
    },
    [files, previews, uploadedUrls, maxFiles, maxSize, acceptedTypes, onUpload, disabled]
  );

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleRemovePreview = (index: number) => {
    if (disabled) return;

    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);

    // 释放对象 URL
    URL.revokeObjectURL(previews[index]);

    setFiles(newFiles);
    setPreviews(newPreviews);
    onUpload(newFiles);
  };

  const handleRemoveUploaded = (index: number) => {
    if (disabled || !onRemove) return;
    onRemove(index);
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const totalImages = uploadedUrls.length + previews.length;
  const canUploadMore = totalImages < maxFiles;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {canUploadMore && (
        <div
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border hover:border-primary/50 hover:bg-muted/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(",")}
            multiple
            onChange={handleFileInputChange}
            disabled={disabled}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Upload className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">
                点击或拖拽上传图片
              </p>
              <p className="text-sm text-muted-foreground">
                支持 JPG、PNG、WEBP 格式，单个文件不超过 {maxSize}MB
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                最多上传 {maxFiles} 张图片（已上传 {totalImages}/{maxFiles}）
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Grid */}
      {(uploadedUrls.length > 0 || previews.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {/* Uploaded Images */}
          {uploadedUrls.map((url, index) => (
            <div key={`uploaded-${index}`} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border-2 border-border">
                <img
                  src={url}
                  alt={`已上传 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              {onRemove && !disabled && (
                <button
                  onClick={() => handleRemoveUploaded(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <div className="absolute bottom-2 left-2 right-2 bg-background/80 backdrop-blur-sm rounded px-2 py-1 text-xs text-center">
                已上传
              </div>
            </div>
          ))}

          {/* Preview Images */}
          {previews.map((preview, index) => (
            <div key={`preview-${index}`} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border-2 border-primary">
                <img
                  src={preview}
                  alt={`预览 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              {!disabled && (
                <button
                  onClick={() => handleRemovePreview(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <div className="absolute bottom-2 left-2 right-2 bg-primary/80 backdrop-blur-sm rounded px-2 py-1 text-xs text-center text-primary-foreground">
                待上传
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
