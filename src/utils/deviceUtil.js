/**
 * Device Utility — Safe wrapper around @capacitor/device.
 * Falls back to browser-based UUID when running in a web browser
 * (where Capacitor native APIs are not available).
 */

let _webDeviceId = null;

function getOrCreateWebDeviceId() {
  if (_webDeviceId) return _webDeviceId;

  // Check sessionStorage first
  const stored = sessionStorage.getItem('__web_device_id');
  if (stored) {
    _webDeviceId = stored;
    return _webDeviceId;
  }

  // Generate a new UUID for this browser session
  const uuid = 'web-' + ([1e7] + -1e3 + -4e3 + -8e3 + -1e11)
    .toString()
    .replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );

  sessionStorage.setItem('__web_device_id', uuid);
  _webDeviceId = uuid;
  return _webDeviceId;
}

export const DeviceUtil = {
  async getId() {
    try {
      // Try native Capacitor first (works on Android/iOS)
      const { Device } = await import('@capacitor/device');
      const info = await Device.getId();
      return { identifier: info.identifier };
    } catch {
      // Fallback for web browser
      return { identifier: getOrCreateWebDeviceId() };
    }
  },

  async getInfo() {
    try {
      const { Device } = await import('@capacitor/device');
      return await Device.getInfo();
    } catch {
      return {
        platform: 'web',
        operatingSystem: navigator.platform || 'unknown',
        osVersion: 'browser',
        model: navigator.userAgent.substring(0, 50),
      };
    }
  },
};
