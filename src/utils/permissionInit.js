import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';

export const requestAppPermissions = async () => {
  const results = [];

  try {
    const locPerm = await Geolocation.requestPermissions();
    results.push({ permission: 'location', granted: locPerm.location === 'granted' });
  } catch {
    results.push({ permission: 'location', granted: false });
  }

  try {
    const { platform } = await Device.getInfo();
    results.push({ permission: 'notifications', platform });
  } catch {
    results.push({ permission: 'notifications', granted: false });
  }

  const denied = results.filter(r => r.granted === false);
  if (denied.length > 0) {
    console.warn('Permissions denied:', denied.map(d => d.permission).join(', '));
  }

  return results;
};
