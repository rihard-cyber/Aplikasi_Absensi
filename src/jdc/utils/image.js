/**
 * =======================================================
 *   SMPJDC SECURITY MANAGEMENT SYSTEM
 *   Module: Image Compressor Utility
 *   Signed by: Richard Meha (by -Richard)
 *   Last Maintained: 2026-06-07
 *   Description: Canvas-based base64 image compression 
 *                to keep localStorage usage within 5MB.
 * =======================================================
 */

/**
 * Compress base64 image string to reduce localStorage usage
 * @param {string} base64Str - The original base64 image data URL
 * @param {number} maxWidth - Max width of compressed image
 * @param {number} maxHeight - Max height of compressed image
 * @param {number} quality - Quality multiplier between 0.1 and 1.0
 * @returns {Promise<string>} - Compressed base64 image data URL
 */
export function compressImage(base64Str, maxWidth = 500, maxHeight = 500, quality = 0.5) {
  return new Promise((resolve) => {
    if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Maintain aspect ratio
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

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Export as compressed JPEG to get maximum size savings
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    img.onerror = () => {
      resolve(base64Str); // Fallback to original image if drawing fails
    };
  });
}
