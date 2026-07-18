/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Compresses and resizes a Base64 image using HTML Canvas.
 * Reduces dimensions to fit within maxWidth/maxHeight and encodes as JPEG with specified quality.
 */
export function compressImage(
  base64Str: string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve) => {
    // If it's already small or not a valid data URL, skip compression
    if (!base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }

    const img = new window.Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Adjust dimensions if necessary
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw image onto the canvas (resizing it)
        ctx.drawImage(img, 0, 0, width, height);
        // Export to JPEG with compressed quality (0.0 to 1.0)
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}
