import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Image, ZoomIn } from 'lucide-react';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

interface ImageUploadProps {
  onImagesChange: (images: ImageFile[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImagesChange,
  maxImages = 5,
  maxSizeMB = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className = '',
}) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<ImageFile | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return 'ประเภทไฟล์ไม่ถูกต้อง กรุณาอัพโหลดไฟล์รูปภาพ';
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `ขนาดไฟล์เกิน ${maxSizeMB}MB`;
    }
    return null;
  };

  const processFiles = useCallback((files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);

    if (images.length + fileArray.length > maxImages) {
      setError(`อัพโหลดได้สูงสุด ${maxImages} รูป`);
      return;
    }

    const newImages: ImageFile[] = [];

    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      newImages.push({
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }

    const updatedImages = [...images, ...newImages];
    setImages(updatedImages);
    onImagesChange(updatedImages);
  }, [images, maxImages, onImagesChange, acceptedTypes, maxSizeMB]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  const removeImage = useCallback((id: string) => {
    const imageToRemove = images.find(img => img.id === id);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
    }

    const updatedImages = images.filter(img => img.id !== id);
    setImages(updatedImages);
    onImagesChange(updatedImages);
  }, [images, onImagesChange]);

  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // For now, just open file picker with camera capture
      // In production, you'd implement a full camera capture UI
      stream.getTracks().forEach(track => track.stop());

      if (inputRef.current) {
        inputRef.current.setAttribute('capture', 'environment');
        inputRef.current.click();
        inputRef.current.removeAttribute('capture');
      }
    } catch {
      // Fallback to file picker
      inputRef.current?.click();
    }
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-600" />
          อัพโหลดรูปภาพอาการ
        </h3>
        <span className="text-sm text-gray-500">
          {images.length}/{maxImages} รูป
        </span>
      </div>

      {/* Drop Zone */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center transition-all
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'}
          ${images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        aria-label="อัพโหลดรูปภาพ"
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          multiple
          onChange={handleFileInput}
          className="hidden"
          aria-label="อัพโหลดรูปภาพ"
        />

        <div className="space-y-3">
          <div className="flex justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <Camera className="w-8 h-8 text-emerald-600" />
            </div>
          </div>

          <div>
            <p className="font-medium text-gray-700">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือก</p>
            <p className="text-sm text-gray-500 mt-1">
              รองรับ JPEG, PNG, WebP ขนาดไม่เกิน {maxSizeMB}MB
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Image className="w-4 h-4" />
              เลือกจากคลัง
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openCamera();
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              ถ่ายรูป
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-100"
            >
              <img
                src={image.preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />

              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewImage(image)}
                  className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Preview image"
                >
                  <ZoomIn className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                  aria-label="Remove image"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* File Name */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-xs text-white truncate">{image.file.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <button
            type="button"
            className="fixed inset-0 bg-transparent border-none cursor-default"
            onClick={() => setPreviewImage(null)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreviewImage(null); } }}
            aria-label="Close preview"
            tabIndex={0}
          />
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage.preview}
              alt="Full preview"
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close preview"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
