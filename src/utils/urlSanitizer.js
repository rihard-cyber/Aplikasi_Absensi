/**
 * Sanitizes a URL to prevent Cross-Site Scripting (XSS) attacks.
 * Filters out dangerous protocols such as 'javascript:'.
 * 
 * @param {string} url - The URL to sanitize.
 * @returns {string} The sanitized URL.
 */
export const sanitizeUrl = (url) => {
  if (!url) return '';
  const trimmedUrl = String(url).trim();
  
  // Prevent javascript:, data: (except safe images), vbscript: protocols
  const lowerUrl = trimmedUrl.toLowerCase();
  if (
    lowerUrl.startsWith('javascript:') ||
    lowerUrl.startsWith('vbscript:') ||
    (lowerUrl.startsWith('data:') && !lowerUrl.startsWith('data:image/'))
  ) {
    return 'about:blank';
  }
  
  return trimmedUrl;
};
