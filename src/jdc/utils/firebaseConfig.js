const firebaseConfig = {
  apiKey: 'AIzaSyDJuWIsmXdRLoRnXu4gf0UlVO3ic00TVcE',
  authDomain: 'app-smpjdc.firebaseapp.com',
  projectId: 'app-smpjdc',
  storageBucket: 'app-smpjdc.firebasestorage.app',
  messagingSenderId: '101515885137',
  appId: '1:101515885137:web:67d274d9f37d7ac6221670',
  measurementId: 'G-T3GFRS6NG9'
};

// Jika apiKey kosong, Firebase tidak akan diaktifkan
// dan aplikasi tetap pakai localStorage seperti biasa
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && firebaseConfig.projectId;
};

export default firebaseConfig;
