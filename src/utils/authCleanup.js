/**
 * Unified Authentication Cleanup Utility
 * Ensures all session-related data is cleared across both the main app
 * and the specialized modules (like JDC) during logout or session expiration.
 */

export const clearAllAuthData = () => {
  // 1. Session Storage
  try {
    sessionStorage.clear();
  } catch (e) {
    console.warn('Failed to clear sessionStorage:', e);
  }

  // 2. Local Storage (Main App Keys)
  const mainKeys = [
    'is_authenticated',
    'user_role',
    'original_role',
    'user_division',
    'tenant_logo_url',
    'tenant_name',
    'pwa_dismissed_until',
    'app_theme'
  ];

  // 3. Local Storage (JDC / Security Module Keys)
  // We clear everything with the 'smpjdc_' prefix and specific data keys
  const jdcKeys = [
    'smpjdc_last_route',
    'smpjdc_theme',
    'smpjdc_pos_list',
    'sapujagat_users',
    'sapujagat_areas',
    'smpjdc_db_version'
  ];

  try {
    // Clear known keys
    [...mainKeys, ...jdcKeys].forEach(key => localStorage.removeItem(key));

    // Clear PINs and dynamic keys (prefix based)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('smpjdc_pin_') || key.startsWith('jdc_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.warn('Failed to clear localStorage:', e);
  }

  // 4. Reset memory-based caches if any exist globally
  if (window.location.hash) {
    // Optional: Reset to root if needed, though usually handled by Navigate component
  }
};
