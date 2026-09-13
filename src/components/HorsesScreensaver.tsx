import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Clock, Moon, ArrowLeft, Eye, ShieldCheck } from 'lucide-react';
import { SiteSettings } from '../types';
import {
  whiteHorseClipartUrl,
  brownHorseClipartUrl,
  goldenHorseClipartUrl,
  realDesertNightBgUrl,
  getTransparentClipartCanvas,
  drawArabianHorseVectorClipart,
} from './ArabianHorseClipartHelper';

interface HorsesScreensaverProps {
  isOpen: boolean;
  onDismiss: () => void;
  siteSettings: SiteSettings;
}

export const HorsesScreensaver: React.FC<HorsesScreensaverProps> = ({
  isOpen,
  onDismiss,
  siteSettings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Live Clock, Hijri Date, and Gregorian Date State
  const [currentTime, setCurrentTime] = useState<string>('');
  const [hijriDate, setHijriDate] = useState<string>('');
  const [gregorianDate, setGregorianDate] = useState<string>('');

  useEffect(() => {
    const updateTimeAndDates = () => {
      const now = new Date();

      // Current Time in Arabic
      setCurrentTime(
        now.toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );

      // Hijri Date (التاريخ الهجري - أم القرى)
      try {
        const hFormatted = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(now);
        setHijriDate(hFormatted.endsWith('هـ') ? hFormatted : `${hFormatted} هـ`);
      } catch (e) {
        setHijriDate('');
      }

      // Gregorian Date in Arabic (التاريخ الميلادي)
      try {
        const gFormatted = new Intl.DateTimeFormat('ar-EG', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(now);
        setGregorianDate(`${gFormatted} م`);
      } catch (e) {
        setGregorianDate(now.toLocaleDateString('ar-SA') + ' م');
      }
    };

    updateTimeAndDates();
    const interval = setInterval(updateTimeAndDates, 1000);
    return () => clearInterval(interval);
  }, []);

  // Dismiss on ESC or user action
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDismiss]);

  // Main Canvas Rendering for Realistic White and Brown Arabian Horses galloping in Desert
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Desert Sand & Dust Particles
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      size: number;
      color: string;
      life: number;
      maxLife: number;
    }

    interface Star {
      x: number;
      y: number;
      size: number;
      baseAlpha: number;
      blinkSpeed: number;
    }

    const particles: Particle[] = [];
    const stars: Star[] = Array.from({ length: 75 }, () => ({
      x: Math.random() * width,
      y: Math.random() * (height * 0.65),
      size: Math.random() * 2 + 0.6,
      baseAlpha: Math.random() * 0.7 + 0.3,
      blinkSpeed: Math.random() * 0.03 + 0.01,
    }));

    // Three Realistic Purebred Arabian Horses (White & Brown - بدون أجنحة - كليب آرت حقيقي)
    const horsesConfig = [
      {
        id: 'white',
        name: 'الأشهب الأصيل (أبيض فضي)',
        clipartUrl: whiteHorseClipartUrl,
        bodyColor: '#F8FAFC',       // Pearl White
        shadeColor: '#CBD5E1',      // Silvery shadow
        highlightColor: '#FFFFFF',  // Pure white highlight
        maneColor: '#FFFFFF',       // Silky white mane
        maneSecondary: '#E2E8F0',
        tailColor: '#FFFFFF',
        muzzleColor: '#475569',     // Slate charcoal muzzle
        hoofColor: '#334155',
        hasStar: false,
        hasSocks: false,
        scale: 1.25,
        offsetY: 0,
        leadDistance: 0,            // First Lead
      },
      {
        id: 'bay_brown',
        name: 'الكميت الأصيل (بني كستنائي)',
        clipartUrl: brownHorseClipartUrl,
        bodyColor: '#78350F',       // Rich Mahogany Chestnut Brown
        shadeColor: '#451A03',      // Deep dark brown shadow
        highlightColor: '#9A3412',  // Warm amber highlight
        maneColor: '#1C1917',       // Silky black mane (Classic Bay Arabian)
        maneSecondary: '#292524',
        tailColor: '#1C1917',
        muzzleColor: '#292524',
        hoofColor: '#1C1917',
        hasStar: true,              // Distinctive Arabian white star on forehead
        hasSocks: false,
        scale: 1.18,
        offsetY: -14,
        leadDistance: 115,          // Second
      },
      {
        id: 'golden_brown',
        name: 'الأشقر المذهب (بني ذهبي)',
        clipartUrl: goldenHorseClipartUrl,
        bodyColor: '#92400E',       // Warm Golden Brown / Amber Chestnut
        shadeColor: '#713F12',      // Deep brown shading
        highlightColor: '#B45309',  // Luminous golden sheen
        maneColor: '#FDE68A',       // Flaxen blonde/golden mane
        maneSecondary: '#F59E0B',
        tailColor: '#FDE68A',
        muzzleColor: '#451A03',
        hoofColor: '#78350F',
        hasStar: false,
        hasSocks: true,             // White pastern socks on feet
        scale: 1.14,
        offsetY: 10,
        leadDistance: 230,          // Third
      },
    ];

    // Preload transparent real Arabian horse cliparts
    horsesConfig.forEach((cfg) => {
      getTransparentClipartCanvas(cfg.clipartUrl);
    });

    const desertBg = new Image();
    desertBg.src = realDesertNightBgUrl;
    let desertBgReady = false;
    desertBg.onload = () => {
      desertBgReady = true;
    };

    let startTime = performance.now();
    let traverseX = width + 180; // Continuous journey across desert from right to left

    // Real Arabian Horse Clipart Gallop Renderer (Wingless, pure Arabian anatomy)
    const drawHorse = (
      hx: number,
      hy: number,
      scale: number,
      gallopCycle: number,
      cfg: (typeof horsesConfig)[0]
    ) => {
      const g = (gallopCycle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const entry = getTransparentClipartCanvas(cfg.clipartUrl);

      // 1. Render REAL ARABIAN HORSE CLIPART if loaded
      if (entry && entry.loaded && entry.canvas && entry.canvas.width > 0) {
        const targetW = 175 * scale;
        const targetH = targetW / (entry.aspectRatio || 1.33);

        // Natural gallop oscillation
        const bodyBob = Math.sin(g * 2) * 5.5;
        const pitch = Math.sin(g) * 0.04;

        ctx.save();
        ctx.translate(hx, hy + bodyBob);
        ctx.rotate(pitch);

        // Ground shadow on desert sand
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, targetH * 0.44, targetW * 0.38, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(35, 15, 5, 0.55)';
        ctx.filter = 'blur(6px)';
        ctx.fill();
        ctx.restore();

        // Draw transparent real Arabian horse clipart
        ctx.drawImage(
          entry.canvas,
          -targetW * 0.5,
          -targetH * 0.5,
          targetW,
          targetH
        );
        ctx.restore();

        // Spawn sand dust particles at hooves
        if (Math.random() < 0.38) {
          particles.push({
            x: hx + (Math.random() * 20 + 15),
            y: hy + 38 + (Math.random() * 8 - 4),
            vx: Math.random() * 3.5 + 2.0, // drifts backward (to the right)
            vy: -(Math.random() * 2.2 + 0.6),
            alpha: 0.9,
            size: Math.random() * 4.5 + 1.8,
            color: Math.random() > 0.4 ? '#F59E0B' : (Math.random() > 0.5 ? '#D97706' : '#FEF3C7'),
            life: 0,
            maxLife: 38,
          });
        }
        return;
      }

      ctx.save();
      ctx.translate(hx, hy);
      ctx.scale(scale, scale);

      // Facing Left: standard natural motion in RTL Arabian desert (from right to left)
      // Gallop vertical oscillation & spine pitch
      const bodyBob = Math.sin(g) * 8.5;
      const pitch = Math.sin(g) * 0.085;

      ctx.translate(0, bodyBob);
      ctx.rotate(pitch);

      // Shadow cast onto desert sand
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(
        -2,
        34 - bodyBob * 0.5,
        44 * (1 - Math.abs(Math.sin(g)) * 0.15),
        7.5,
        0,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = 'rgba(45, 20, 5, 0.55)';
      ctx.filter = 'blur(4px)';
      ctx.fill();
      ctx.restore();

      // Leg motion calculations for rotary gallop
      const frontLegL = Math.sin(g);
      const frontLegR = Math.sin(g - 0.7);
      const backLegL = Math.sin(g - 2.1);
      const backLegR = Math.sin(g - 2.8);

      const drawLeg = (
        rootX: number,
        rootY: number,
        phase: number,
        isBackLeg: boolean,
        isFarSide: boolean
      ) => {
        ctx.save();
        ctx.lineWidth = isBackLeg ? 6.2 : 5.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = isFarSide ? cfg.shadeColor : cfg.bodyColor;

        let kneeX: number, kneeY: number, ankleX: number, ankleY: number, hoofX: number, hoofY: number;

        if (!isBackLeg) {
          // Foreleg (القدم الأمامية)
          const forwardReach = phase * 23;
          const tuck = Math.max(0, -phase) * 16;
          kneeX = rootX - 6 + forwardReach * 0.5;
          kneeY = rootY + 14 - tuck * 0.6;
          ankleX = rootX - 8 + forwardReach * 0.85;
          ankleY = rootY + 24 - tuck * 0.9;
          hoofX = rootX - 11 + forwardReach;
          hoofY = rootY + 29 - tuck;
        } else {
          // Hindleg with powerful muscular hock (العرقوب والقدم الخلفية)
          const kickBack = -phase * 25;
          const gather = Math.max(0, phase) * 15;
          kneeX = rootX + 8 + kickBack * 0.45;
          kneeY = rootY + 13 - gather * 0.45;
          ankleX = rootX + 13 + kickBack * 0.8;
          ankleY = rootY + 23 - gather * 0.8;
          hoofX = rootX + 17 + kickBack;
          hoofY = rootY + 29 - gather;
        }

        // Leg bone stroke
        ctx.beginPath();
        ctx.moveTo(rootX, rootY);
        ctx.lineTo(kneeX, kneeY);
        ctx.lineTo(ankleX, ankleY);
        ctx.lineTo(hoofX, hoofY);
        ctx.stroke();

        // White sock marking if applicable (تحجيل أبيض بالقوائم)
        if (cfg.hasSocks && !isFarSide) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = isBackLeg ? 5.5 : 4.5;
          ctx.beginPath();
          ctx.moveTo(ankleX, ankleY);
          ctx.lineTo(hoofX, hoofY);
          ctx.stroke();
        }

        // Hoof (الحافر المشذب)
        ctx.fillStyle = cfg.hoofColor;
        ctx.beginPath();
        ctx.arc(hoofX, hoofY, 2.9, 0, Math.PI * 2);
        ctx.fill();

        // Spawn desert sand dust when hoof strikes ground
        if (hoofY > 24 && Math.random() < 0.35) {
          particles.push({
            x: hx + hoofX * scale,
            y: hy + hoofY * scale + bodyBob * scale,
            vx: (Math.random() * 3 + 1.5) * (Math.random() < 0.85 ? 1 : -0.3),
            vy: -Math.random() * 2.2 - 0.5,
            alpha: 0.85,
            size: Math.random() * 4 + 1.8,
            color: Math.random() < 0.5 ? '#F59E0B' : (Math.random() < 0.5 ? '#D97706' : '#FDE68A'),
            life: 0,
            maxLife: 35 + Math.random() * 25,
          });
        }

        ctx.restore();
      };

      // 1. Far Legs (Background)
      drawLeg(18, 5, backLegR, true, true);
      drawLeg(-18, 5, frontLegR, false, true);

      // 2. Muscular Arabian Horse Torso (جذع الخيل الرشيق الممتلئ)
      ctx.beginPath();
      ctx.fillStyle = cfg.bodyColor;
      ctx.ellipse(0, 0, 30, 13.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Flank and shoulder muscle definition
      ctx.beginPath();
      ctx.fillStyle = cfg.shadeColor;
      ctx.ellipse(-14, 2, 10, 8, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = cfg.highlightColor;
      ctx.ellipse(-13, -3, 11, 8.5, -0.25, 0, Math.PI * 2);
      ctx.fill();

      // Rounded Arabian Croup (كفل الخيل العربي المستدير)
      ctx.beginPath();
      ctx.fillStyle = cfg.highlightColor;
      ctx.ellipse(15, -2.5, 12.5, 10.5, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // 3. Near Legs (Foreground)
      drawLeg(16, 5, backLegL, true, false);
      drawLeg(-20, 5, frontLegL, false, false);

      // 4. Characteristic Arched Arabian Crest & Dished Head (الرقبة المقوسة والرأس المقعر)
      const headBob = Math.sin(g + 0.4) * 4.5;
      const neckBaseX = -20;
      const neckBaseY = -4;

      ctx.save();
      ctx.translate(neckBaseX, neckBaseY);
      ctx.rotate(pitch * 0.5 + headBob * 0.02);

      // Arched crest curve (تقوس رقبة الخيل العربي الشامخة)
      ctx.beginPath();
      ctx.fillStyle = cfg.bodyColor;
      ctx.moveTo(0, 7);
      ctx.quadraticCurveTo(-11, -19, -20, -25); // Elegant high arch
      ctx.lineTo(-27, -19);
      ctx.quadraticCurveTo(-17, 2, 2, 9);
      ctx.closePath();
      ctx.fill();

      // Crest highlight
      ctx.beginPath();
      ctx.fillStyle = cfg.highlightColor;
      ctx.moveTo(-2, 2);
      ctx.quadraticCurveTo(-10, -16, -18, -23);
      ctx.lineTo(-22, -20);
      ctx.quadraticCurveTo(-13, -3, -1, 3);
      ctx.closePath();
      ctx.fill();

      // Dished Arabian Head & Fine Muzzle (الرأس العربي الأصيل ذو المظهر المقعر)
      const headX = -22;
      const headY = -24;

      ctx.beginPath();
      ctx.fillStyle = cfg.bodyColor;
      ctx.moveTo(headX, headY);
      // Dished concave bridge of nose (التقوس المقعر المميز للخيل العربي)
      ctx.quadraticCurveTo(headX - 8, headY + 3, headX - 16, headY + 9);
      // Tapered fine muzzle
      ctx.lineTo(headX - 13, headY + 13);
      // Deep jowl cheek (الفك العريض المستدير)
      ctx.quadraticCurveTo(headX - 3, headY + 11, headX + 3, headY + 2);
      ctx.closePath();
      ctx.fill();

      // White star marking on forehead if bay brown horse (غرة بيضاء عربية في الجبهة)
      if (cfg.hasStar) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(headX - 4, headY - 1);
        ctx.lineTo(headX - 1, headY + 3);
        ctx.lineTo(headX - 4, headY + 7);
        ctx.lineTo(headX - 7, headY + 3);
        ctx.closePath();
        ctx.fill();
      }

      // Soft muzzle shading (الخطم الناعم)
      ctx.fillStyle = cfg.muzzleColor;
      ctx.beginPath();
      ctx.arc(headX - 14.5, headY + 10.5, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Flared nostril (منخر الخيل العربي المتسع)
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(headX - 15, headY + 10, 1, 0, Math.PI * 2);
      ctx.fill();

      // Fine Inward-Curving Arabian Alert Ears (الآذان المرهفة المقوسة للداخل)
      ctx.fillStyle = cfg.bodyColor;
      ctx.beginPath();
      ctx.moveTo(headX + 2, headY - 1);
      ctx.quadraticCurveTo(headX + 3, headY - 9, headX + 1, headY - 10);
      ctx.lineTo(headX - 2, headY - 3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = cfg.shadeColor;
      ctx.beginPath();
      ctx.moveTo(headX - 1, headY - 2);
      ctx.quadraticCurveTo(headX, headY - 8, headX - 2, headY - 9);
      ctx.lineTo(headX - 4, headY - 3);
      ctx.closePath();
      ctx.fill();

      // Large Liquid Dark Arabian Eye with specular highlight (عين الخيل العربي الكحيلة الواسعة)
      ctx.fillStyle = '#090D16';
      ctx.beginPath();
      ctx.arc(headX - 5, headY + 3.2, 2.1, 0, Math.PI * 2);
      ctx.fill();
      // White eye sparkle
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(headX - 5.6, headY + 2.6, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Silky Flowing Mane (عرف الخيل العربي الحريري المتطاير مع الريح)
      ctx.fillStyle = cfg.maneColor;
      for (let m = 0; m < 6; m++) {
        const maneWave = Math.sin(g * 2.2 + m * 0.7) * 4.5;
        ctx.beginPath();
        ctx.ellipse(
          -2 + m * 3.6,
          -17 + m * 3.6 + maneWave * 0.5,
          3.6,
          9.5,
          0.75 + maneWave * 0.08,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      ctx.restore();

      // 5. High-Carried Arabian Flagged Tail (الذيل المرفوع كراية النصر - سمة الخيل العربي)
      const tailRootX = 26;
      const tailRootY = -6;
      ctx.save();
      ctx.translate(tailRootX, tailRootY);
      const tailSway = Math.sin(g * 2) * 8.5;

      ctx.beginPath();
      ctx.fillStyle = cfg.tailColor;
      ctx.moveTo(0, 0);
      // Trademark high arch: tail arches proudly straight up before flowing back
      ctx.quadraticCurveTo(9, -16, 22 + tailSway, -8);
      ctx.quadraticCurveTo(30 + tailSway, 12, 11, 9);
      ctx.quadraticCurveTo(4, 2, 0, 0);
      ctx.closePath();
      ctx.fill();

      // Secondary flowing tail strands
      ctx.beginPath();
      ctx.fillStyle = cfg.maneSecondary || cfg.tailColor;
      ctx.moveTo(4, -4);
      ctx.quadraticCurveTo(14, -14, 25 + tailSway, -5);
      ctx.quadraticCurveTo(18 + tailSway, 5, 8, 4);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      ctx.restore();
    };

    // Render loop
    const render = (time: number) => {
      const elapsed = (time - startTime) * 0.001;
      const gallopSpeed = 11.5; // Fast, noble Arabian gallop
      const gallopCycleTime = elapsed * gallopSpeed;

      ctx.clearRect(0, 0, width, height);

      // 1. Arabian Desert Sunset & Twilight Sky (سماء الصحراء العربية الأصيلة)
      if (desertBgReady && desertBg.complete && desertBg.naturalWidth > 0) {
        ctx.drawImage(desertBg, 0, 0, width, height);
        // Soft atmospheric twilight tint
        ctx.fillStyle = 'rgba(6, 11, 22, 0.22)';
        ctx.fillRect(0, 0, width, height);
      } else {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, '#060B16');     // Deep Night Sky at Zenith
        skyGrad.addColorStop(0.35, '#0B1528');  // Starlit Indigo
        skyGrad.addColorStop(0.65, '#2D1406');  // Warm Terracotta Horizon
        skyGrad.addColorStop(0.85, '#78350F');  // Glowing Desert Dusk
        skyGrad.addColorStop(1, '#9A3412');     // Golden Sand Glow
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Sparkling Desert Stars
      for (let s of stars) {
        const alpha = s.baseAlpha + Math.sin(elapsed * 2 + s.x) * 0.25;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, alpha)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Desert Crescent Moon (هلال عربي منير في سماء الصحراء)
      const moonX = width * 0.84;
      const moonY = height * 0.20;
      const moonGrad = ctx.createRadialGradient(moonX, moonY, 12, moonX, moonY, 70);
      moonGrad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
      moonGrad.addColorStop(0.45, 'rgba(245, 158, 11, 0.35)');
      moonGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 70, 0, Math.PI * 2);
      ctx.fill();

      // Crescent Moon Shape
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0B1528';
      ctx.beginPath();
      ctx.arc(moonX + 9, moonY - 5, 20, 0, Math.PI * 2);
      ctx.fill();

      // 4. Realistic Arabian Desert Sand Dunes (كثبان رمال الصحراء العربية المتموجة)
      const groundLevel = height * 0.81;

      // Far Sand Dunes (الكثبان البعيدة)
      ctx.fillStyle = '#3E1D0A';
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, groundLevel - 65);
      ctx.bezierCurveTo(width * 0.35, groundLevel - 105, width * 0.65, groundLevel - 45, width, groundLevel - 80);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Mid Dunes with Golden Sand Rim (الكثبان الوسطى ذات الحواف الذهبية)
      const midDuneGrad = ctx.createLinearGradient(0, groundLevel - 50, 0, height);
      midDuneGrad.addColorStop(0, '#5C2408');
      midDuneGrad.addColorStop(1, '#331203');
      ctx.fillStyle = midDuneGrad;
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, groundLevel - 25);
      ctx.bezierCurveTo(width * 0.28, groundLevel - 60, width * 0.72, groundLevel + 5, width, groundLevel - 35);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Dune crest golden rim light
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundLevel - 25);
      ctx.bezierCurveTo(width * 0.28, groundLevel - 60, width * 0.72, groundLevel + 5, width, groundLevel - 35);
      ctx.stroke();

      // Foreground Running Sand Track (مضمار الرمال الصحراوية الساخنة)
      const groundGrad = ctx.createLinearGradient(0, groundLevel, 0, height);
      groundGrad.addColorStop(0, '#6B2D09');
      groundGrad.addColorStop(0.3, '#542106');
      groundGrad.addColorStop(1, '#270E02');
      ctx.fillStyle = groundGrad;
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, groundLevel + 12);
      ctx.bezierCurveTo(width * 0.5, groundLevel + 2, width * 0.8, groundLevel + 22, width, groundLevel + 12);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Glowing desert sand ridges and ripples (تموجات رمال الصحراء)
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.35)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, groundLevel + 12);
      ctx.bezierCurveTo(width * 0.5, groundLevel + 2, width * 0.8, groundLevel + 22, width, groundLevel + 12);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, groundLevel + 32);
      ctx.bezierCurveTo(width * 0.4, groundLevel + 26, width * 0.85, groundLevel + 38, width, groundLevel + 30);
      ctx.stroke();

      // 5. Gallop Traverse: 3 Horses gallop smoothly from right to left across the desert
      const travelSpeed = (width + 550) / 10; // traverse across in ~10 seconds
      traverseX -= travelSpeed * 0.016;
      if (traverseX < -380) {
        traverseX = width + 280;
      }

      const isMobile = width < 500;
      const spacing = isMobile ? 90 : 135;
      const scaleMultiplier = isMobile ? 1.05 : 1.48;

      // Draw rear to lead so front horse is naturally in the foreground
      for (let i = horsesConfig.length - 1; i >= 0; i--) {
        const cfg = horsesConfig[i];
        const hX = traverseX + i * spacing;
        const hY = groundLevel + (cfg.offsetY || 0);
        const cycle = gallopCycleTime - i * 0.65;
        drawHorse(hX, hY, cfg.scale * scaleMultiplier, cycle, cfg);
      }

      // 6. Flying Sand Particles & Dust Plumes (سحب غبار ورمال الصحراء المتطايرة)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.alpha = 1 - p.life / p.maxLife;

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
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
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      onClick={onDismiss}
      className="fixed inset-0 z-[9999] overflow-hidden select-none cursor-pointer flex flex-col justify-between p-6 sm:p-10 animate-in fade-in duration-500 bg-[#060B16]"
      id="horses_screensaver_overlay"
      title="انقر في أي مكان للخروج من شاشة التوقف"
    >
      {/* 60FPS Fullscreen Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none"
      />

      {/* Ambient Desert Vignette */}
      <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/75 pointer-events-none" />

      {/* TOP HEADER: Logo, Site Name, Live Clock, Hijri & Gregorian Dates */}
      <div className="relative z-20 flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-7xl mx-auto pointer-events-auto">
        
        {/* Brand identity */}
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-gold/30 shadow-2xl">
          <img
            src={siteSettings.logoUrl || '/logo.jpg'}
            alt="شعار الموقع"
            className="h-10 w-auto object-contain rounded-lg drop-shadow-md"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/logo.jpg';
            }}
          />
          <div className="text-right">
            <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>{siteSettings.siteName || 'إستابلي للخيول العربية الأصيلة'}</span>
              <Sparkles className="w-4 h-4 text-gold animate-pulse" />
            </h2>
            <p className="text-[10px] text-amber-200/90 font-semibold">
              شاشة التوقف الصحراوية • ملتقى الأصالة والفروسية العربية
            </p>
          </div>
        </div>

        {/* Live Clock with Hijri & Gregorian Dates (إذا كان مفعلاً) */}
        {siteSettings.screensaverShowClock !== false && (
          <div className="flex items-center gap-3.5 bg-black/70 backdrop-blur-md px-5 sm:px-6 py-3 rounded-2xl border border-gold/40 text-right shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/40 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-gold animate-pulse" />
            </div>
            <div>
              {/* Digital Time */}
              <div className="text-xl sm:text-2xl font-black font-mono text-gold tracking-wider" dir="ltr">
                {currentTime || '00:00:00'}
              </div>
              
              {/* Hijri & Gregorian Dates */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 text-[11px] sm:text-xs mt-0.5 font-bold">
                {/* Hijri Date */}
                <span className="text-amber-300 flex items-center gap-1">
                  <span>🕌</span>
                  <span>{hijriDate || 'التاريخ الهجري'}</span>
                </span>

                <span className="hidden sm:inline text-white/30">•</span>

                {/* Gregorian Date */}
                <span className="text-slate-200 flex items-center gap-1">
                  <span>📅</span>
                  <span>{gregorianDate || 'التاريخ الميلادي'}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CENTER: Prophetic Hadith Banner */}
      <div className="relative z-20 text-center max-w-2xl mx-auto pointer-events-none mt-auto mb-20 sm:mb-26 px-4">
        <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-white drop-shadow-[0_2px_15px_rgba(0,0,0,0.95)] tracking-tight leading-relaxed">
          « الخَيْلُ مَعْقُودٌ فِي نَوَاصِيهَا الخَيْرُ إِلَى يَوْمِ القِيَامَةِ »
        </h1>
      </div>

      {/* BOTTOM FOOTER: Wake Up Notice & Return Button */}
      <div className="relative z-20 flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-7xl mx-auto pt-4 border-t border-white/10 pointer-events-auto">
        
        {/* Interaction helper */}
        <div className="flex items-center gap-2 text-xs text-slate-300 font-bold bg-black/50 backdrop-blur-xs px-4 py-2 rounded-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span>حرك الفأرة، اضغط أي مفتاح، أو المس الشاشة للعودة فوراً</span>
        </div>

        {/* Exit Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="inline-flex items-center gap-2.5 bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy font-black text-xs sm:text-sm px-7 py-3 rounded-xl shadow-2xl transition hover:scale-105 active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>متابعة التصفح (انقر هنا أو اضغط ESC)</span>
        </button>

      </div>
    </div>
  );
};
