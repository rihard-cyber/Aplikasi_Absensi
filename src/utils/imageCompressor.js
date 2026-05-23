/**
 * Compress an image file client-side using HTML5 Canvas.
 * Adjusts quality automatically to keep file size under maxSizeMB.
 * 
 * @param {File} file - The original image File object.
 * @param {number} maxSizeMB - Maximum target size in Megabytes (default: 1MB).
 * @param {number} maxWidthOrHeight - Maximum dimension width/height (default: 1024px).
 * @returns {Promise<File>} A Promise that resolves to the compressed File object.
 */
export const compressImage = (file, maxSizeMB = 1, maxWidthOrHeight = 1024) => {
  return new Promise((resolve) => {
    // Only compress image files (JPEG, PNG, WEBP, etc.)
    if (!file || !file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize image keeping aspect ratio
        if (width > height) {
          if (width > maxWidthOrHeight) {
            height = Math.round((height * maxWidthOrHeight) / width);
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width = Math.round((width * maxWidthOrHeight) / height);
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;

        // Recursive helper to check file size and compress
        const attemptCompression = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return resolve(file); // Fallback to original
              }
              
              // If file is still too large and we can decrease quality further
              if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.1) {
                quality -= 0.1;
                attemptCompression();
              } else {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              }
            },
            'image/jpeg',
            quality
          );
        };

        attemptCompression();
      };
      
      img.onerror = () => resolve(file);
    };
    
    reader.onerror = () => resolve(file);
  });
};
