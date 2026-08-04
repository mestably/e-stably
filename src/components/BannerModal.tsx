/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Sparkles, Volume2 } from 'lucide-react';
import { AnnouncementBanner } from '../types';

interface BannerModalProps {
  banner: AnnouncementBanner | null;
}

export default function BannerModal({ banner }: BannerModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Only proceed if banner exists, is enabled, and has an image URL
    if (!banner || !banner.enabled || !banner.imageUrl) {
      setIsVisible(false);
      return;
    }

    const duration = (banner.durationSeconds || 7) * 1000;
    
    // Smooth fade in delay after site mount
    const timerShow = setTimeout(() => {
      setIsVisible(true);
    }, 400);

    // Progress bar tick interval (60fps smooth)
    const startTime = Date.now() + 400;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingRatio = Math.max(0, 1 - elapsed / duration);
      setProgress(remainingRatio * 100);

      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 50);

    // Auto-close after 7 seconds
    const timerAutoClose = setTimeout(() => {
      handleClose();
    }, duration + 400);

    return () => {
      clearTimeout(timerShow);
      clearTimeout(timerAutoClose);
      clearInterval(interval);
    };
  }, [banner]);

  const handleClose = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsFadingOut(false);
    }, 400); // match fade out transition
  };

  if (!isVisible || !banner || !banner.imageUrl) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`relative bg-white rounded-3xl overflow-hidden shadow-2xl max-w-lg w-full border-2 border-gold/40 transform transition-all duration-500 ${
          isFadingOut ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Animated Countdown Progress Bar at Top */}
        <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-gold via-gold-dark to-navy transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Top Header Tag & Close Button */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
          <span className="bg-navy/85 backdrop-blur-md text-gold font-extrabold text-[10px] px-3 py-1 rounded-full border border-gold/40 shadow-md flex items-center gap-1.5 pointer-events-auto">
            <Sparkles className="w-3 h-3 text-gold" />
            إعلان ترويجي
          </span>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-navy/80 hover:bg-navy backdrop-blur-md text-white flex items-center justify-center shadow-lg transition cursor-pointer border border-white/20 pointer-events-auto hover:scale-110"
            title="إغلاق الإعلان"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Banner Image Container */}
        <div className="relative w-full max-h-[70vh] min-h-[220px] bg-slate-900 flex items-center justify-center overflow-hidden">
          <img 
            src={banner.imageUrl} 
            alt={banner.title || 'إعلان ترويجي'} 
            className="w-full h-full object-contain max-h-[70vh]"
          />

          {/* Optional Overlay Banner Title or Link */}
          {(banner.title || banner.linkUrl) && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-navy/95 via-navy/70 to-transparent p-4 sm:p-5 text-white flex items-center justify-between gap-3">
              <div className="min-w-0">
                {banner.title && (
                  <h3 className="font-extrabold text-xs sm:text-sm text-gold truncate">{banner.title}</h3>
                )}
                <span className="text-[10px] text-slate-300 block">يختفي هذا الإعلان تلقائياً خلال 7 ثوانٍ</span>
              </div>

              {banner.linkUrl && (
                <a
                  href={banner.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gold hover:bg-gold-dark text-navy font-black text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-md"
                >
                  <span>التفاصيل</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Bottom Helper Bar if no link */}
        {!banner.title && !banner.linkUrl && (
          <div className="bg-navy p-3 text-center text-[10px] text-slate-300 font-semibold flex items-center justify-center gap-2">
            <span>سيختفي هذا الإعلان تلقائياً خلال 7 ثوانٍ</span>
          </div>
        )}

      </div>
    </div>
  );
}
