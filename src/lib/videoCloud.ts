/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const RTDB_BASE_URL = 'https://horses-835f1-default-rtdb.asia-southeast1.firebasedatabase.app';
const VIDEO_CLOUD_PREFIX = 'cloud-video://';
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB max for reliable cloud playback across all devices
const CHUNK_SIZE_BYTES = 921600; // 900 KB (multiple of 3 bytes for clean Base64 encoding)

// In-memory cache of resolved Blob URLs so re-opening ads is instantaneous
const resolvedVideoCache = new Map<string, string>();
const inFlightDownloads = new Map<string, Promise<string>>();

export function isCloudVideoRef(ref?: string | null): boolean {
  return !!ref && ref.startsWith(VIDEO_CLOUD_PREFIX);
}

export function extractCloudVideoId(ref: string): string {
  return ref.slice(VIDEO_CLOUD_PREFIX.length).trim();
}

export function normalizeVideoMimeType(fileType?: string, fileName?: string): string {
  const lowerName = (fileName || '').toLowerCase();
  const lowerType = (fileType || '').toLowerCase();

  if (lowerType.includes('webm') || lowerName.endsWith('.webm')) {
    return 'video/webm';
  }
  if (lowerType.includes('ogg') || lowerName.endsWith('.ogv') || lowerName.endsWith('.ogg')) {
    return 'video/ogg';
  }
  // Treat mp4, m4v, mov (QuickTime H.264/AAC), 3gp as video/mp4 for broadest cross-browser HTML5 playback
  return 'video/mp4';
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const step = 8192;
  for (let i = 0; i < bytes.length; i += step) {
    const slice = bytes.subarray(i, Math.min(i + step, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  let lastError: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  throw lastError || new Error('Network error');
}

export interface VideoMeta {
  id: string;
  mimeType: string;
  chunkCount: number;
  totalSize: number;
  fileName: string;
  createdAt: string;
}

/**
 * Uploads a video file directly to Firebase Realtime Database in compressed chunks
 * under site_settings/horse_videos/{videoId}, making it permanently viewable by any user
 * from any browser, device, or deployment URL worldwide.
 */
export async function uploadVideoToCloud(
  file: File,
  onProgress?: (percent: number, message: string) => void
): Promise<string> {
  if (file.size > MAX_VIDEO_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `حجم الفيديو (${sizeMb} ميجابايت) يتجاوز الحد الأقصى المسموح به للرفع السحابي (50 ميجابايت). يرجى اختيار فيديو أصغر حجماً أو تقليل جودته.`
    );
  }

  const videoId = `vid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const mimeType = normalizeVideoMimeType(file.type, file.name);

  onProgress?.(20, 'جاري قراءة وتجهيز ملف الفيديو للرفع السحابي...');
  const arrayBuffer = await file.arrayBuffer();
  const totalBytes = arrayBuffer.byteLength;
  const chunkCount = Math.max(1, Math.ceil(totalBytes / CHUNK_SIZE_BYTES));

  const meta: VideoMeta = {
    id: videoId,
    mimeType,
    chunkCount,
    totalSize: totalBytes,
    fileName: file.name,
    createdAt: new Date().toISOString(),
  };

  // 1. Save video metadata
  await fetchWithRetry(`${RTDB_BASE_URL}/site_settings/horse_videos/${videoId}/meta.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  });

  // 2. Upload chunks with 2x concurrency and live progress (25% -> 98%)
  let completedChunks = 0;
  const concurrency = 2;
  let nextIdx = 0;

  const uploadWorker = async () => {
    while (nextIdx < chunkCount) {
      const idx = nextIdx++;
      const start = idx * CHUNK_SIZE_BYTES;
      const end = Math.min(start + CHUNK_SIZE_BYTES, totalBytes);
      const chunkBytes = new Uint8Array(arrayBuffer, start, end - start);
      const b64 = uint8ToBase64(chunkBytes);

      await fetchWithRetry(`${RTDB_BASE_URL}/site_settings/horse_videos/${videoId}/chunks/${idx}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b64),
      });

      completedChunks++;
      const pct = Math.min(98, 25 + Math.round((completedChunks / chunkCount) * 73));
      onProgress?.(pct, `جاري رفع الفيديو سحابياً (${pct}%)... (${completedChunks}/${chunkCount})`);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, chunkCount) }, () => uploadWorker())
  );

  // Cache local playable blob URL immediately for instant preview by the uploader
  const cloudRef = `${VIDEO_CLOUD_PREFIX}${videoId}`;
  try {
    const localBlob = new Blob([arrayBuffer], { type: mimeType });
    const blobUrl = URL.createObjectURL(localBlob);
    resolvedVideoCache.set(cloudRef, blobUrl);
  } catch {}

  onProgress?.(100, 'تم رفع الفيديو سحابياً بنجاح (100%)!');
  return cloudRef;
}

/**
 * Resolves any stored video reference (cloud-video://..., data:..., /uploads/..., https://...)
 * into a browser-playable URL, downloading cloud chunks if needed.
 */
export async function resolveVideoUrl(
  videoRef: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (!videoRef) {
    throw new Error('لا يوجد رابط فيديو صالح.');
  }

  // Return cached Blob URL immediately if already fetched
  const cached = resolvedVideoCache.get(videoRef);
  if (cached) {
    onProgress?.(100);
    return cached;
  }

  // Handle legacy Data URLs or external HTTP(S) URLs
  if (videoRef.startsWith('data:') || videoRef.startsWith('blob:')) {
    onProgress?.(100);
    return videoRef;
  }

  if (videoRef.startsWith('http://') || videoRef.startsWith('https://')) {
    onProgress?.(100);
    return videoRef;
  }

  // Handle legacy /uploads/videos/... relative URLs (verify existence first)
  if (videoRef.startsWith('/')) {
    try {
      const headRes = await fetch(videoRef, { method: 'HEAD', cache: 'no-store' });
      if (headRes.ok) {
        onProgress?.(100);
        return videoRef;
      }
    } catch {}
    throw new Error('EXPIRED_LOCAL_VIDEO');
  }

  // Handle permanent cloud-video://{videoId}
  if (!isCloudVideoRef(videoRef)) {
    throw new Error('صيغة رابط الفيديو غير مدعومة.');
  }

  // Deduplicate simultaneous downloads of the same video
  if (inFlightDownloads.has(videoRef)) {
    return inFlightDownloads.get(videoRef)!;
  }

  const downloadPromise = (async () => {
    try {
      const videoId = extractCloudVideoId(videoRef);
      onProgress?.(5);

      const metaRes = await fetchWithRetry(
        `${RTDB_BASE_URL}/site_settings/horse_videos/${videoId}/meta.json`,
        { cache: 'no-store' }
      );
      const meta: VideoMeta | null = await metaRes.json();

      if (!meta || !meta.chunkCount || meta.chunkCount < 1) {
        throw new Error('تعذر العثور على ملف الفيديو في السحابة، ربما تم حذفه.');
      }

      onProgress?.(12);
      const parts: BlobPart[] = new Array(meta.chunkCount);
      let fetchedCount = 0;
      let nextIdx = 0;
      const concurrency = 4;

      const downloadWorker = async () => {
        while (nextIdx < meta.chunkCount) {
          const idx = nextIdx++;
          const chunkRes = await fetchWithRetry(
            `${RTDB_BASE_URL}/site_settings/horse_videos/${videoId}/chunks/${idx}.json`,
            { cache: 'default' }
          );
          const b64: string | null = await chunkRes.json();
          if (!b64 || typeof b64 !== 'string') {
            throw new Error(`بيانات الجزء رقم ${idx + 1} من الفيديو غير متوفرة.`);
          }
          const decoded = base64ToUint8(b64);
          parts[idx] = decoded as unknown as BlobPart;
          fetchedCount++;
          const pct = Math.min(98, 12 + Math.round((fetchedCount / meta.chunkCount) * 86));
          onProgress?.(pct);
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(concurrency, meta.chunkCount) }, () => downloadWorker())
      );

      const blob = new Blob(parts, { type: meta.mimeType || 'video/mp4' });
      const blobUrl = URL.createObjectURL(blob);
      resolvedVideoCache.set(videoRef, blobUrl);
      onProgress?.(100);
      return blobUrl;
    } finally {
      inFlightDownloads.delete(videoRef);
    }
  })();

  inFlightDownloads.set(videoRef, downloadPromise);
  return downloadPromise;
}

/**
 * Deletes a cloud video when the horse ad or video item is removed.
 */
export async function deleteCloudVideo(videoRef: string): Promise<void> {
  if (!isCloudVideoRef(videoRef)) return;
  const videoId = extractCloudVideoId(videoRef);
  try {
    resolvedVideoCache.delete(videoRef);
    await fetch(`${RTDB_BASE_URL}/site_settings/horse_videos/${videoId}.json`, {
      method: 'DELETE',
    });
  } catch (e) {
    console.warn('Cloud video cleanup warning:', e);
  }
}
