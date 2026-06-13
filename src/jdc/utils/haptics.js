import { Capacitor } from '@capacitor/core';

let Haptics = null;

const initHaptics = async () => {
  if (Haptics) return;
  if (!Capacitor.isNativePlatform()) return;
  try {
    const mod = await import('@capacitor/haptics');
    Haptics = mod.Haptics;
  } catch (_) {}
};

export const hapticLight = async () => {
  await initHaptics();
  if (!Haptics) return;
  try { await Haptics.impact({ style: 'Light' }); } catch (_) {}
};

export const hapticMedium = async () => {
  await initHaptics();
  if (!Haptics) return;
  try { await Haptics.impact({ style: 'Medium' }); } catch (_) {}
};

export const hapticHeavy = async () => {
  await initHaptics();
  if (!Haptics) return;
  try { await Haptics.impact({ style: 'Heavy' }); } catch (_) {}
};

export const hapticSuccess = async () => {
  await initHaptics();
  if (!Haptics) return;
  try { await Haptics.notification({ type: 'Success' }); } catch (_) {}
};

export const hapticWarning = async () => {
  await initHaptics();
  if (!Haptics) return;
  try { await Haptics.notification({ type: 'Warning' }); } catch (_) {}
};

export const hapticError = async () => {
  await initHaptics();
  if (!Haptics) return;
  try { await Haptics.notification({ type: 'Error' }); } catch (_) {}
};
