/**
 * =======================================================
 *   SMPJDC SECURITY MANAGEMENT SYSTEM
 *   Module: Navigation & Back Button Interceptor Utilities
 *   Description: Global registry for custom back handlers,
 *                managing web stack pop interceptions.
 * =======================================================
 */

if (!window.smpjdc_back_handlers) {
  window.smpjdc_back_handlers = [];
}

/**
 * Register a callback function to handle back navigation.
 * When the back button (browser or hardware) is pressed, the most recently
 * registered handler is executed. If it returns true, the default action is blocked.
 * 
 * @param {Function} handler - Callback function returning true if handled, false otherwise.
 * @returns {Function} Unregister function to cleanup on component unmount.
 */
export function registerBackHandler(handler) {
  window.smpjdc_back_handlers.push(handler);
  
  // Return cleanup function
  return () => {
    window.smpjdc_back_handlers = window.smpjdc_back_handlers.filter(h => h !== handler);
  };
}

/**
 * Execute all registered back handlers in reverse order (stack behavior).
 * 
 * @returns {boolean} True if any handler intercepted and processed the back action.
 */
export function executeBackHandlers() {
  if (window.smpjdc_back_handlers && window.smpjdc_back_handlers.length > 0) {
    // Execute from newest to oldest
    for (let i = window.smpjdc_back_handlers.length - 1; i >= 0; i--) {
      try {
        const handled = window.smpjdc_back_handlers[i]();
        if (handled) {
          return true;
        }
      } catch (e) {
        console.error("Error executing back handler:", e);
      }
    }
  }
  return false;
}
