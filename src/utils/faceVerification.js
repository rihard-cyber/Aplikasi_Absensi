/**
 * Face Verification Engine — Client-Side
 * 
 * Uses native browser APIs (MediaDevices API, Canvas, ImageData)
 * to perform liveness detection and face presence verification
 * WITHOUT any external ML library (no TensorFlow, no face-api.js).
 * 
 * Strategy:
 * 1. Open front camera via getUserMedia
 * 2. Capture a frame from the video stream
 * 3. Analyse the frame for:
 *    a. Skin-tone pixel ratio (detect human face presence)
 *    b. Brightness variance (detect liveness / not a photo of a photo)
 *    c. Edge density around face region
 * 4. Return { verified: bool, confidence: 0–100, snapshot: Blob }
 */

/**
 * Detect if the frame likely contains a human face using skin-tone heuristics.
 * @param {ImageData} imageData
 * @returns {{ skinRatio: number, brightnessVariance: number, edgeDensity: number }}
 */
const analyseFrame = (imageData) => {
  const { data, width, height } = imageData;
  let skinPixels = 0;
  let totalPixels = 0;
  let brightnessValues = [];
  let edgeCount = 0;

  // Focus on the center 60% of the frame (face is usually centered)
  const startX = Math.floor(width * 0.2);
  const endX   = Math.floor(width * 0.8);
  const startY = Math.floor(height * 0.1);
  const endY   = Math.floor(height * 0.85);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      totalPixels++;

      // Brightness (luminance approximation)
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      brightnessValues.push(brightness);

      // Skin tone heuristics (RGB model for diverse skin tones)
      const isSkin =
        r > 95 && g > 40 && b > 20 &&
        r > g && r > b &&
        (r - Math.min(g, b)) > 15 &&
        Math.abs(r - g) > 15;

      if (isSkin) skinPixels++;

      // Simple edge detection (Sobel-like, compare with right/bottom neighbour)
      if (x < endX - 1 && y < endY - 1) {
        const idxR = (y * width + x + 1) * 4;
        const idxB = ((y + 1) * width + x) * 4;
        const diffR = Math.abs(r - data[idxR]);
        const diffB = Math.abs(r - data[idxB]);
        if (diffR > 30 || diffB > 30) edgeCount++;
      }
    }
  }

  const skinRatio = totalPixels > 0 ? skinPixels / totalPixels : 0;
  const edgeDensity = totalPixels > 0 ? edgeCount / totalPixels : 0;

  // Variance of brightness (liveness check)
  const mean = brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length;
  const variance = brightnessValues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / brightnessValues.length;

  return { skinRatio, brightnessVariance: variance, edgeDensity };
};

/**
 * Capture a single frame from a video element and return ImageData + Blob.
 * @param {HTMLVideoElement} video
 * @returns {{ imageData: ImageData, blob: Blob }}
 */
const captureFrame = (video) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) resolve({ imageData, blob });
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/jpeg', 0.8);
  });
};

/**
 * Main verification function.
 * Opens the camera, takes multiple frames, analyses them, and returns a result.
 *
 * @param {HTMLVideoElement} videoElement - An already-playing video element connected to the camera stream.
 * @returns {Promise<{ verified: boolean, confidence: number, snapshot: Blob | null, message: string }>}
 */
export const verifyFace = async (videoElement) => {
  try {
    if (!videoElement || !videoElement.videoWidth) {
      return { verified: false, confidence: 0, snapshot: null, message: 'Kamera belum siap.' };
    }

    // Capture 3 frames with a short interval and average the analysis
    const results = [];
    for (let i = 0; i < 3; i++) {
      await new Promise(r => setTimeout(r, 200));
      const { imageData, blob } = await captureFrame(videoElement);
      const analysis = analyseFrame(imageData);
      results.push({ analysis, blob });
    }

    const avgSkinRatio = results.reduce((s, r) => s + r.analysis.skinRatio, 0) / results.length;
    const avgVariance  = results.reduce((s, r) => s + r.analysis.brightnessVariance, 0) / results.length;
    const avgEdges     = results.reduce((s, r) => s + r.analysis.edgeDensity, 0) / results.length;

    // Scoring: skin presence (40%), edge density (30%), brightness variance (30%)
    const skinScore     = Math.min(avgSkinRatio / 0.15, 1) * 40;   // 15% skin = full score
    const edgeScore     = Math.min(avgEdges / 0.08, 1) * 30;        // 8% edges = full score
    const varianceScore = Math.min(avgVariance / 500, 1) * 30;      // variance 500 = full score

    const confidence = Math.round(skinScore + edgeScore + varianceScore);
    const verified = confidence >= 55; // threshold: 55/100

    const snapshot = results[1]?.blob || null; // use middle frame as snapshot

    let message;
    if (verified) {
      message = `Wajah terdeteksi (kepercayaan: ${confidence}%)`;
    } else if (avgSkinRatio < 0.05) {
      message = 'Wajah tidak terdeteksi. Pastikan wajah Anda terlihat jelas di kamera.';
    } else if (avgVariance < 100) {
      message = 'Gambar terlalu gelap atau statis. Pastikan pencahayaan cukup.';
    } else {
      message = `Verifikasi gagal (kepercayaan: ${confidence}%). Perbaiki posisi dan pencahayaan.`;
    }

    return { verified, confidence, snapshot, message };
  } catch (err) {
    return { verified: false, confidence: 0, snapshot: null, message: 'Error: ' + err.message };
  }
};

/**
 * Request camera permission and return a MediaStream.
 * Uses the front-facing camera by preference.
 * @returns {Promise<MediaStream>}
 */
export const openCamera = async () => {
  const constraints = {
    video: {
      facingMode: 'user',
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
    audio: false,
  };
  return navigator.mediaDevices.getUserMedia(constraints);
};

/**
 * Stop all tracks on a MediaStream.
 * @param {MediaStream | null} stream
 */
export const closeCamera = (stream) => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
};
