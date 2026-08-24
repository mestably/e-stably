/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, MouseEvent, TouchEvent } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Download, ExternalLink, RotateCcw, Maximize2 } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  title?: string;
  subtitle?: string;
}

export default function ImageLightboxModal({
  isOpen,
  onClose,
  images = [],
  initialIndex = 0,
  title,
  subtitle
}: ImageLightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Sync initialIndex when modal opens or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      const validIndex = Math.max(0, Math.min(initialIndex, (images?.length || 1) - 1));
      setCurrentIndex(validIndex);
      setZoomLevel(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex, images]);

  // Reset transform when changing image
  const resetTransform = useCallback(() => {
    setZoomLevel(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleNext = useCallback(() => {
    if (!images || images.length <= 1) return;
    resetTransform();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images, resetTransform]);

  const handlePrev = useCallback(() => {
    if (!images || images.length <= 1) return;
    resetTransform();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images, resetTransform]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.3, 3.5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.3, 0.7);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleToggleZoom = () => {
    if (zoomLevel > 1) {
      resetTransform();
    } else {
      setZoomLevel(2);
    }
  };

  // Keyboard navigation & controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        // RTL or LTR
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0' || e.key.toLowerCase() === 'r') {
        resetTransform();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev, resetTransform]);

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Pan / Drag handlers when zoomed
  const handleMouseDown = (e: MouseEvent) => {
    if (zoomLevel <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Swipe handlers
  const handleTouchStart = (e: TouchEvent) => {
    if (zoomLevel > 1) return; // Allow pinch or pan
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStartX === null || zoomLevel > 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swiped left -> next
        handleNext();
      } else {
        // Swiped right -> prev
        handlePrev();
      }
    }
    setTouchStartX(null);
  };

  if (!isOpen || !images || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md select-none animate-in fade-in duration-200"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-b from-black/80 to-transparent z-20 text-white border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer flex items-center justify-center"
            title="إغلاق المعرض (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
              <span>{title || 'معرض الصور'}</span>
              {images.length > 1 && (
                <span className="text-xs font-normal text-gold bg-gold/10 border border-gold/30 px-2 py-0.5 rounded-full font-mono">
                  {currentIndex + 1} / {images.length}
                </span>
              )}
            </h3>
            {subtitle && <p className="text-[11px] text-slate-300">{subtitle}</p>}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="تكبير الصورة (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="تصغير الصورة (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Reset Zoom / Rotate */}
          {(zoomLevel !== 1 || rotation !== 0 || position.x !== 0 || position.y !== 0) && (
            <button
              onClick={resetTransform}
              className="p-2 rounded-lg bg-gold/20 hover:bg-gold/30 text-gold transition cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="إعادة ضبط الحجم والدوران (0)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إعادة ضبط</span>
            </button>
          )}

          {/* Rotate 90deg */}
          <button
            onClick={handleRotate}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="تدوير الصورة 90 درجة"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Open in new tab */}
          <a
            href={currentImage}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="فتح الصورة بحجمها الكامل في نافذة جديدة"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden p-2 sm:p-6 touch-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Previous Button (Left) */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 sm:left-6 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white transition border border-white/20 shadow-xl cursor-pointer hover:scale-110 active:scale-95"
            title="الصورة السابقة (سهم يسار)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Image Container with Transforms */}
        <div
          className={`relative max-w-full max-h-full flex items-center justify-center ${
            zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
          }`}
          onMouseDown={handleMouseDown}
          onClick={zoomLevel === 1 ? handleToggleZoom : undefined}
        >
          <img
            src={currentImage}
            referrerPolicy="no-referrer"
            alt={title || 'Image Preview'}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            }}
            className="max-h-[75vh] max-w-[90vw] object-contain rounded-lg shadow-2xl pointer-events-auto"
            draggable={false}
          />
        </div>

        {/* Next Button (Right) */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-6 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white transition border border-white/20 shadow-xl cursor-pointer hover:scale-110 active:scale-95"
            title="الصورة التالية (سهم يمين)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Floating Zoom Indicator */}
        {zoomLevel !== 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/75 text-gold text-xs px-3 py-1 rounded-full border border-gold/40 shadow-lg font-mono z-20">
            تكبير {Math.round(zoomLevel * 100)}%
          </div>
        )}
      </div>

      {/* Bottom Thumbnail Strip (if more than 1 image) */}
      {images.length > 1 && (
        <div className="px-4 py-3 bg-gradient-to-t from-black/90 via-black/70 to-transparent z-20 border-t border-white/10">
          <div className="flex items-center justify-center gap-2 overflow-x-auto max-w-2xl mx-auto py-1">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => {
                  resetTransform();
                  setCurrentIndex(idx);
                }}
                className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition duration-200 cursor-pointer ${
                  currentIndex === idx
                    ? 'border-gold scale-105 shadow-md shadow-gold/30 opacity-100'
                    : 'border-white/20 opacity-60 hover:opacity-90 hover:border-white/50'
                }`}
              >
                <img
                  src={img}
                  referrerPolicy="no-referrer"
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {currentIndex === idx && (
                  <span className="absolute bottom-0 inset-x-0 bg-gold text-navy text-[8px] font-bold text-center py-0.5 leading-none">
                    نشط
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
