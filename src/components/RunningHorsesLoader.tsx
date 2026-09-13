import React, { useEffect, useRef, useState } from 'react';
import {
  whiteHorseClipartUrl,
  brownHorseClipartUrl,
  goldenHorseClipartUrl,
  getTransparentClipartCanvas,
  drawArabianHorseVectorClipart,
} from './ArabianHorseClipartHelper';

interface RunningHorsesLoaderProps {
  /** Mode: 'inline' for inside/replacing the CTA button, 'fullscreen' for full overlay, 'banner' for a wide banner */
  mode?: 'inline' | 'fullscreen' | 'compact';
  /** Text to show below or above */
  loadingText?: string;
  /** Whether horses are in fast gallop sprint (e.g. during active navigation) */
  isSprinting?: boolean;
  /** Progress percentage 0-100 (if controlled) */
  progress?: number;
  /** Optional callback when user clicks or animation triggers */
  onClick?: () => void;
  /** Custom height */
  height?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  maxLife: number;
  life: number;
}

export const RunningHorsesLoader: React.FC<RunningHorsesLoaderProps> = ({
  mode = 'inline',
  loadingText = 'جاري الانتقال وتجهيز الأقسام...',
  isSprinting = false,
  progress,
  onClick,
  height = 90
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [internalProgress, setInternalProgress] = useState(0);

  // Auto-progress if sprinting and not externally controlled
  useEffect(() => {
    if (!isSprinting || progress !== undefined) return;
    setInternalProgress(0);
    const start = performance.now();
    const duration = 1200; // 1.2s smooth navigation surge

    let frameId: number;
    const updateProgress = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(100, Math.round((elapsed / duration) * 100));
      setInternalProgress(p);
      if (elapsed < duration) {
        frameId = requestAnimationFrame(updateProgress);
      }
    };
    frameId = requestAnimationFrame(updateProgress);

    return () => cancelAnimationFrame(frameId);
  }, [isSprinting, progress]);

  const activeProgress = progress !== undefined ? progress : internalProgress;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.parentElement?.clientWidth || 360;
    let canvasHeight = height;

    const particles: Particle[] = [];
    let time = 0;

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      const dpr = window.devicePixelRatio || 1;
      width = canvas.parentElement.clientWidth;
      canvasHeight = height;
      canvas.width = width * dpr;
      canvas.height = canvasHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // 3 Distinct Purebred Arabian Horses with Authentic Clipart Assets
    const horsesConfig = [
      {
        id: 'white',
        name: 'الأشهب (أبيض فضي أصيل)',
        clipartUrl: whiteHorseClipartUrl,
        bodyColor: '#F8FAFC',
        bodyDark: '#CBD5E1',
        maneColor: '#FFFFFF',
        tailColor: '#FFFFFF',
        scale: 1.05,
        offsetY: 0,
        leadDistance: 0,            // First Lead (leftmost in RTL gallop)
      },
      {
        id: 'bay_brown',
        name: 'الكميت (بني كستنائي أصيل)',
        clipartUrl: brownHorseClipartUrl,
        bodyColor: '#78350F',
        bodyDark: '#451A03',
        maneColor: '#1C1917',
        tailColor: '#1C1917',
        scale: 0.98,
        offsetY: -5,
        leadDistance: 80,           // Second behind
      },
      {
        id: 'golden_brown',
        name: 'الأشقر (بني ذهبي مذهب)',
        clipartUrl: goldenHorseClipartUrl,
        bodyColor: '#92400E',
        bodyDark: '#713F12',
        maneColor: '#FDE68A',
        tailColor: '#FDE68A',
        scale: 0.94,
        offsetY: 6,
        leadDistance: 160,          // Third behind
      },
    ];

    // Preload transparent cliparts
    horsesConfig.forEach((cfg) => {
      getTransparentClipartCanvas(cfg.clipartUrl);
    });

    /**
     * Draw Real Arabian Horse Clipart facing Left (RTL desert sprint)
     */
    const drawHorse = (
      hX: number,
      hY: number,
      scale: number,
      cycle: number,
      config: (typeof horsesConfig)[0]
    ) => {
      const entry = getTransparentClipartCanvas(config.clipartUrl);

      // Natural gallop oscillations
      const bodyBob = Math.sin(cycle * 2) * 3.5;
      const bodyPitch = Math.sin(cycle) * 0.045;

      ctx.save();
      ctx.translate(hX, hY + bodyBob);
      ctx.rotate(bodyPitch);

      if (entry && entry.loaded && entry.canvas && entry.canvas.width > 0) {
        // --- REAL HORSE CLIPART DRAWING ---
        const targetW = 86 * scale;
        const targetH = targetW / (entry.aspectRatio || 1.3);

        // Ground shadow on desert sand
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, targetH * 0.44, targetW * 0.38, 5.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(25, 12, 5, 0.45)';
        ctx.filter = 'blur(4px)';
        ctx.fill();
        ctx.restore();

        // Render transparent real Arabian horse clipart
        ctx.drawImage(
          entry.canvas,
          -targetW * 0.5,
          -targetH * 0.5,
          targetW,
          targetH
        );
      } else {
        // --- ANATOMICAL ARABIAN VECTOR CLIPART FALLBACK ---
        ctx.scale(scale * 0.72, scale * 0.72);
        drawArabianHorseVectorClipart(
          ctx,
          config.bodyColor,
          config.bodyDark,
          config.maneColor,
          config.tailColor,
          cycle
        );
      }

      ctx.restore();

      // Spawn sand dust particles at hooves
      if (Math.random() < (isSprinting ? 0.45 : 0.22)) {
        particles.push({
          x: hX + (Math.random() * 12 + 10),
          y: hY + 22 + (Math.random() * 4 - 2),
          vx: (Math.random() * 2.5 + 1.2) * (isSprinting ? 1.6 : 1.0), // drifts backward to the right
          vy: -(Math.random() * 1.6 + 0.4),
          size: Math.random() * (isSprinting ? 3.8 : 2.5) + 1.2,
          alpha: 0.85,
          color: Math.random() > 0.4 ? '#F59E0B' : (Math.random() > 0.5 ? '#D97706' : '#FEF3C7'),
          maxLife: 30,
          life: 0,
        });
      }
    };

    // Render Loop
    const render = (timestamp: number) => {
      time = timestamp * 0.001;
      const speedMultiplier = isSprinting ? 1.6 : 1.0;
      const gallopCycleTime = time * 7.5 * speedMultiplier;

      // Clear Canvas
      ctx.clearRect(0, 0, width, canvasHeight);

      // 1. Draw Subtle Ground Dust & Horizon Trail
      const groundLevel = canvasHeight - 20;

      // Gradient track line
      const trackGrad = ctx.createLinearGradient(0, groundLevel, width, groundLevel);
      trackGrad.addColorStop(0, 'rgba(212, 175, 55, 0.4)');
      trackGrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.8)');
      trackGrad.addColorStop(1, 'rgba(212, 175, 55, 0.1)');

      ctx.beginPath();
      ctx.moveTo(0, groundLevel);
      ctx.lineTo(width, groundLevel);
      ctx.strokeStyle = trackGrad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Speed dashed ground streaks moving to the right (since horses move left)
      const streakOffset = (time * 180 * speedMultiplier) % 40;
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 12]);
      ctx.lineDashOffset = -streakOffset;
      ctx.beginPath();
      ctx.moveTo(0, groundLevel + 4);
      ctx.lineTo(width, groundLevel + 4);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // 2. Draw Speed Lines in background if sprinting
      if (isSprinting) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const lineY = 15 + i * 18;
          const lineX = ((time * 300 + i * 90) % (width + 100)) - 50;
          ctx.beginPath();
          ctx.moveTo(lineX, lineY);
          ctx.lineTo(lineX + 60, lineY);
          ctx.stroke();
        }
      }

      // 3. Calculate Base Positions for 3 Horses
      // Responsive spacing for mobile vs desktop
      const isMobile = width < 420;
      const spacingFactor = isMobile ? 0.65 : 1.0;
      const responsiveScale = isMobile ? 0.82 : 1.0;

      // In sprint/navigation mode: traverse dynamically across the track from right to left!
      let leadBaseX: number;
      if (isSprinting) {
        // Progress 0 -> 100: traverse from width * 0.95 down to -80
        const normalizedProgress = (activeProgress || 0) / 100;
        leadBaseX = (width * 0.9) - normalizedProgress * (width + 120);
      } else {
        // Ambient / steady gallop: centered-right galloping with natural surge
        leadBaseX = width * (isMobile ? 0.45 : 0.6) + Math.sin(time * 1.8) * (isMobile ? 8 : 16);
      }

      const baseCenterY = groundLevel - (isMobile ? 20 : 24);

      // Draw Horses from REAR to FRONT (so Lead horse is in foreground)
      // Rear -> Middle -> Lead
      for (let i = horsesConfig.length - 1; i >= 0; i--) {
        const cfg = horsesConfig[i];
        // Staggered horse X: Lead at 0, Trailing horses follow behind to the right (+ X)
        const horseX = leadBaseX + (cfg.leadDistance * spacingFactor);
        const horseY = baseCenterY + cfg.offsetY;
        const horseCycle = gallopCycleTime - i * 0.55; // rhythmic phase difference

        drawHorse(horseX, horseY, cfg.scale * responsiveScale, horseCycle, cfg);
      }

      // 4. Update & Draw Particles (dust / gold sparks)
      for (let pIdx = particles.length - 1; pIdx >= 0; pIdx--) {
        const p = particles[pIdx];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha = 1 - (p.life / p.maxLife);

        if (p.life >= p.maxLife) {
          particles.splice(pIdx, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [height, isSprinting]);

  return (
    <div 
      ref={containerRef}
      onClick={onClick}
      className={`relative w-full overflow-hidden transition-all duration-300 select-none ${
        mode === 'inline' 
          ? 'rounded-2xl border-2 border-gold/70 bg-gradient-to-r from-navy-dark via-navy to-slate-900 shadow-2xl p-2' 
          : 'rounded-2xl bg-navy-dark/95 backdrop-blur-md border border-gold/40 p-3'
      }`}
      id="running_horses_container"
      style={{ minHeight: `${height}px` }}
    >
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute inset-0 bg-radial from-gold/10 via-transparent to-transparent pointer-events-none" />

      {/* Header / Badges overlay */}
      <div className="relative z-10 flex items-center justify-between px-2 pt-1 pb-1">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSprinting ? 'bg-amber-400' : 'bg-gold'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isSprinting ? 'bg-amber-500' : 'bg-gold'}`}></span>
          </span>
          <span className="text-[11px] sm:text-xs font-black text-gold tracking-wide">
            {isSprinting ? 'انطلاق الجياد العربية الأصيلة...' : 'سباق الجياد العربية الثلاثة (Estably)'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-300 font-bold bg-black/40 px-2.5 py-0.5 rounded-full border border-white/10">
          <span>{loadingText}</span>
          {isSprinting && (
            <span className="text-gold font-black font-mono">{activeProgress}%</span>
          )}
        </div>
      </div>

      {/* The Dynamic 60fps Canvas */}
      <div className="relative w-full" style={{ height: `${height - 30}px` }}>
        <canvas 
          ref={canvasRef} 
          className="w-full h-full block" 
        />
      </div>

      {/* Progress Line Bar when sprinting / loading */}
      {isSprinting && (
        <div className="relative w-full h-1.5 bg-black/50 rounded-full overflow-hidden mt-1 border border-white/10">
          <div 
            className="h-full bg-gradient-to-l from-gold via-amber-300 to-white transition-all duration-150 ease-out rounded-full shadow-sm shadow-gold"
            style={{ width: `${activeProgress}%` }}
          />
        </div>
      )}
    </div>
  );
};
