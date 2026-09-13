// Arabian Horse Clipart Asset Manager & Transparent Canvas Cache (Real Photographic Cutouts)
import realWhiteHorseClipartUrl from '../assets/images/real_white_horse_1789339382415.jpg';
import realGreyArabianClipartUrl from '../assets/images/real_grey_arabian_1789339875016.jpg';
import realHorseIconUrl from '../assets/images/real_horse_icon_1789339887538.jpg';
import realBrownHorseClipartUrl from '../assets/images/real_brown_horse_1789339395137.jpg';
import realGoldenHorseClipartUrl from '../assets/images/real_golden_horse_1789339405079.jpg';
import realDesertNightBgUrl from '../assets/images/real_desert_night_1789339419044.jpg';

export {
  realGreyArabianClipartUrl,
  realWhiteHorseClipartUrl,
  realHorseIconUrl,
  realBrownHorseClipartUrl,
  realGoldenHorseClipartUrl,
  realDesertNightBgUrl,
  // Backwards compatibility aliases: first horse is the unbroken real silver-grey/white Arabian
  realGreyArabianClipartUrl as whiteHorseClipartUrl,
  realBrownHorseClipartUrl as brownHorseClipartUrl,
  realGoldenHorseClipartUrl as goldenHorseClipartUrl,
  realDesertNightBgUrl as desertHorsesBgUrl,
};

export interface ClipartCacheEntry {
  canvas: HTMLCanvasElement;
  loaded: boolean;
  aspectRatio: number;
}

// In-memory cache for processed transparent cliparts
const clipartCache: Record<string, ClipartCacheEntry> = {};

/**
 * Loads a real horse photo and uses border-connected flood-fill background removal
 * to strip the solid studio background cleanly into transparent PNG canvas,
 * preserving all natural horse body pixels (including pure white/grey coats and silky hair).
 * Supports both dark (pitch black) and bright (studio white) backdrops automatically.
 */
export function getTransparentClipartCanvas(
  url: string,
  onLoaded?: () => void
): ClipartCacheEntry {
  if (clipartCache[url]) {
    return clipartCache[url];
  }

  const offscreen = document.createElement('canvas');
  offscreen.width = 400;
  offscreen.height = 300;

  const entry: ClipartCacheEntry = {
    canvas: offscreen,
    loaded: false,
    aspectRatio: 4 / 3,
  };
  clipartCache[url] = entry;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;

  img.onload = () => {
    try {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      offscreen.width = w;
      offscreen.height = h;
      entry.aspectRatio = w / h;

      const ctx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Sample 4 outer corners to identify background brightness
      const cornerIndices = [0, w - 1, (h - 1) * w, (h - 1) * w + (w - 1)];
      let avgCornerR = 0, avgCornerG = 0, avgCornerB = 0;
      for (const cIdx of cornerIndices) {
        avgCornerR += data[cIdx * 4];
        avgCornerG += data[cIdx * 4 + 1];
        avgCornerB += data[cIdx * 4 + 2];
      }
      avgCornerR /= 4;
      avgCornerG /= 4;
      avgCornerB /= 4;

      const isDarkBg = (avgCornerR + avgCornerG + avgCornerB) / 3 < 65;

      // Identify outer background pixels via BFS floodfill starting strictly from borders
      const isVisited = new Uint8Array(w * h);
      const queue: number[] = [];

      const isBackgroundPixel = (idx: number) => {
        const p = idx * 4;
        const r = data[p];
        const g = data[p + 1];
        const b = data[p + 2];
        if (isDarkBg) {
          // Studio black backdrop: dark pixels far from the silver/grey horse
          return r < 35 && g < 35 && b < 35;
        } else {
          // Studio white backdrop: very high brightness and low color saturation
          const minVal = Math.min(r, g, b);
          const maxVal = Math.max(r, g, b);
          return minVal > 225 && (maxVal - minVal) < 22;
        }
      };

      // Push all 4 outer border pixels as seeds
      for (let x = 0; x < w; x++) {
        const topIdx = x;
        const botIdx = (h - 1) * w + x;
        if (isBackgroundPixel(topIdx)) {
          isVisited[topIdx] = 1;
          queue.push(topIdx);
        }
        if (isBackgroundPixel(botIdx)) {
          isVisited[botIdx] = 1;
          queue.push(botIdx);
        }
      }

      for (let y = 0; y < h; y++) {
        const leftIdx = y * w;
        const rightIdx = y * w + (w - 1);
        if (!isVisited[leftIdx] && isBackgroundPixel(leftIdx)) {
          isVisited[leftIdx] = 1;
          queue.push(leftIdx);
        }
        if (!isVisited[rightIdx] && isBackgroundPixel(rightIdx)) {
          isVisited[rightIdx] = 1;
          queue.push(rightIdx);
        }
      }

      // BFS to flood all connected background
      let head = 0;
      while (head < queue.length) {
        const curr = queue[head++];
        const cx = curr % w;
        const cy = Math.floor(curr / w);

        const neighbors = [
          cy > 0 ? (cy - 1) * w + cx : -1,
          cy < h - 1 ? (cy + 1) * w + cx : -1,
          cx > 0 ? cy * w + (cx - 1) : -1,
          cx < w - 1 ? cy * w + (cx + 1) : -1,
        ];

        for (let n = 0; n < neighbors.length; n++) {
          const nIdx = neighbors[n];
          if (nIdx >= 0 && !isVisited[nIdx] && isBackgroundPixel(nIdx)) {
            isVisited[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }

      // Apply transparency to all flood-filled outer background pixels
      for (let i = 0; i < isVisited.length; i++) {
        if (isVisited[i] === 1) {
          data[i * 4 + 3] = 0; // completely transparent
        } else {
          // Ensure horse body is 100% solid and unbroken
          data[i * 4 + 3] = 255;
        }
      }

      // Soft antialiasing on outer boundary edges
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          if (isVisited[idx] === 0) {
            const hasTransparentNeighbor =
              isVisited[idx - 1] === 1 ||
              isVisited[idx + 1] === 1 ||
              isVisited[idx - w] === 1 ||
              isVisited[idx + w] === 1;

            if (hasTransparentNeighbor) {
              const p = idx * 4;
              const r = data[p];
              const g = data[p + 1];
              const b = data[p + 2];
              if (isDarkBg) {
                // Smooth dark perimeter falloff
                const maxVal = Math.max(r, g, b);
                if (maxVal < 60) {
                  data[p + 3] = Math.max(90, Math.min(255, Math.round(maxVal * 4.2)));
                }
              } else {
                // Smooth white perimeter falloff
                if (r > 200 && g > 200 && b > 200) {
                  const avg = (r + g + b) / 3;
                  data[p + 3] = Math.max(80, Math.min(255, Math.round((255 - avg) * 4.5)));
                }
              }
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      entry.loaded = true;
      if (onLoaded) onLoaded();
    } catch (e) {
      console.warn('Transparent clipart generation fallback:', e);
      entry.loaded = true;
      if (onLoaded) onLoaded();
    }
  };

  img.onerror = () => {
    entry.loaded = true;
    if (onLoaded) onLoaded();
  };

  return entry;
}

/**
 * Authentic Anatomical Arabian Horse Clipart Vector Silhouette (Facing Left)
 * High-precision vector path of a purebred Arabian horse in full gallop.
 * Includes: Dished profile, pricked inward ears, arched crest, muscular torso,
 * high-arched flagged tail, extended gallop forelegs and thrusting hindlegs.
 */
export function drawArabianHorseVectorClipart(
  ctx: CanvasRenderingContext2D,
  color: string,
  shadeColor: string,
  maneColor: string,
  tailColor: string,
  gallopPhase: number
) {
  ctx.save();

  // Subtle natural gallop bounce
  const bob = Math.sin(gallopPhase) * 4;
  const pitch = Math.sin(gallopPhase * 0.9) * 0.05;
  ctx.translate(0, bob);
  ctx.rotate(pitch);

  // 1. Soft Ground Shadow
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 48 - bob * 0.4, 45, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(20, 10, 5, 0.45)';
  ctx.filter = 'blur(4px)';
  ctx.fill();
  ctx.restore();

  // 2. High-Carried Arabian Tail (راية النصر)
  ctx.save();
  ctx.translate(34, -8);
  const tailSway = Math.sin(gallopPhase * 2) * 6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(12, -22, 28 + tailSway, -12);
  ctx.quadraticCurveTo(42 + tailSway, 8, 20 + tailSway * 0.5, 24);
  ctx.quadraticCurveTo(12, 12, 4, 4);
  ctx.closePath();
  ctx.fillStyle = tailColor;
  ctx.fill();

  // Tail secondary strands
  ctx.beginPath();
  ctx.moveTo(2, -4);
  ctx.quadraticCurveTo(18, -26, 32 + tailSway, -14);
  ctx.quadraticCurveTo(24, 0, 8, -2);
  ctx.closePath();
  ctx.fillStyle = shadeColor;
  ctx.fill();
  ctx.restore();

  // 3. Far Hindleg (Thrusting back)
  const farHindSwing = Math.sin(gallopPhase - 2.2) * 16;
  ctx.beginPath();
  ctx.fillStyle = shadeColor;
  ctx.moveTo(22, 10);
  ctx.quadraticCurveTo(28 + farHindSwing * 0.5, 24, 34 + farHindSwing, 38);
  ctx.lineTo(39 + farHindSwing, 39);
  ctx.quadraticCurveTo(28 + farHindSwing * 0.5, 22, 16, 8);
  ctx.closePath();
  ctx.fill();

  // 4. Far Foreleg (Extending forward)
  const farForeSwing = Math.sin(gallopPhase + 0.5) * 18;
  ctx.beginPath();
  ctx.fillStyle = shadeColor;
  ctx.moveTo(-16, 12);
  ctx.quadraticCurveTo(-26 + farForeSwing * 0.5, 24, -36 + farForeSwing, 38);
  ctx.lineTo(-40 + farForeSwing, 37);
  ctx.quadraticCurveTo(-28 + farForeSwing * 0.5, 20, -10, 10);
  ctx.closePath();
  ctx.fill();

  // 5. Main Arabian Muscular Body & Torso
  ctx.beginPath();
  ctx.fillStyle = color;
  // Withering to croup
  ctx.moveTo(-22, -6);
  ctx.bezierCurveTo(-12, -14, 12, -12, 26, -4);
  // Rounded Croup
  ctx.bezierCurveTo(38, 0, 36, 16, 26, 18);
  // Underbelly
  ctx.bezierCurveTo(12, 22, -8, 22, -18, 16);
  // Chest / Shoulder
  ctx.bezierCurveTo(-30, 10, -30, -2, -22, -6);
  ctx.closePath();
  ctx.fill();

  // Flank muscle depth
  ctx.beginPath();
  ctx.fillStyle = shadeColor;
  ctx.ellipse(14, 4, 12, 9, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.ellipse(13, 2, 11, 8, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // 6. Near Hindleg (Foreground thrusting stride)
  const nearHindSwing = Math.sin(gallopPhase - 2.8) * 20;
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.moveTo(18, 8);
  // Muscular gaskin
  ctx.quadraticCurveTo(24, 18, 28 + nearHindSwing * 0.4, 26);
  // Cannon bone and fetlock
  ctx.lineTo(34 + nearHindSwing, 40);
  ctx.lineTo(39 + nearHindSwing, 41); // Hoof
  ctx.lineTo(38 + nearHindSwing, 39);
  ctx.quadraticCurveTo(26 + nearHindSwing * 0.3, 22, 10, 14);
  ctx.closePath();
  ctx.fill();

  // Hoof tip
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.arc(36 + nearHindSwing, 40.5, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 7. Near Foreleg (Foreground reaching forward)
  const nearForeSwing = Math.sin(gallopPhase) * 22;
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.moveTo(-20, 10);
  // Shoulder muscle
  ctx.quadraticCurveTo(-26, 20, -32 + nearForeSwing * 0.5, 28);
  // Lower leg
  ctx.lineTo(-44 + nearForeSwing, 40);
  ctx.lineTo(-48 + nearForeSwing, 39); // Hoof
  ctx.lineTo(-42 + nearForeSwing, 36);
  ctx.quadraticCurveTo(-28 + nearForeSwing * 0.4, 18, -14, 12);
  ctx.closePath();
  ctx.fill();

  // Fore hoof
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.arc(-46 + nearForeSwing, 39.5, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 8. Arched Neck & Dished Arabian Head
  ctx.save();
  ctx.translate(-22, -4);
  const neckBob = Math.sin(gallopPhase * 1.1) * 0.05;
  ctx.rotate(neckBob);

  // Arched Crest
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.moveTo(0, 8);
  ctx.quadraticCurveTo(-14, -18, -26, -26); // High graceful arch
  ctx.lineTo(-34, -20);
  ctx.quadraticCurveTo(-22, 2, 2, 10);
  ctx.closePath();
  ctx.fill();

  // Dished Arabian Head (مظهر مقعر للرأس العربي)
  ctx.beginPath();
  ctx.fillStyle = color;
  const hx = -28;
  const hy = -26;
  ctx.moveTo(hx, hy);
  // Concave profile to fine tapered muzzle
  ctx.quadraticCurveTo(hx - 10, hy + 4, hx - 18, hy + 9);
  ctx.lineTo(hx - 15, hy + 13);
  // Broad cheek / jowl
  ctx.quadraticCurveTo(hx - 4, hy + 12, hx + 4, hy + 3);
  ctx.closePath();
  ctx.fill();

  // Small Inward-Curved Arabian Alert Ears
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.moveTo(hx + 2, hy - 1);
  ctx.quadraticCurveTo(hx + 4, hy - 11, hx + 1, hy - 12);
  ctx.lineTo(hx - 2, hy - 4);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = shadeColor;
  ctx.moveTo(hx - 1, hy - 2);
  ctx.quadraticCurveTo(hx + 1, hy - 10, hx - 2, hy - 11);
  ctx.lineTo(hx - 4, hy - 4);
  ctx.closePath();
  ctx.fill();

  // Large Dark Liquid Arabian Eye
  ctx.fillStyle = '#090D16';
  ctx.beginPath();
  ctx.arc(hx - 6, hy + 3.5, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(hx - 6.6, hy + 2.8, 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Silky Windblown Mane
  ctx.fillStyle = maneColor;
  for (let m = 0; m < 5; m++) {
    const wave = Math.sin(gallopPhase * 2.5 + m * 0.8) * 5;
    ctx.beginPath();
    ctx.ellipse(
      -4 + m * 4.5,
      -18 + m * 4.2 + wave * 0.4,
      4,
      11,
      0.8 + wave * 0.06,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.restore(); // restore neck

  ctx.restore(); // restore body
}

// Automatically preload and process transparent real horse cliparts in background
if (typeof window !== 'undefined') {
  setTimeout(() => {
    try {
      getTransparentClipartCanvas(realWhiteHorseClipartUrl);
      getTransparentClipartCanvas(realBrownHorseClipartUrl);
      getTransparentClipartCanvas(realGoldenHorseClipartUrl);
    } catch {
      // Ignored
    }
  }, 10);
}

