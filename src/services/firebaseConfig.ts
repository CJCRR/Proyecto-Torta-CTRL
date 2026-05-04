import type { FirebaseOptions } from 'firebase/app';

// Configuración pública de Firebase para builds locales y de EAS.
// En producción conviene cargar estos valores con variables EXPO_PUBLIC_*.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'PON_AQUI_TU_API_KEY',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'PON_AQUI_TU_AUTH_DOMAIN',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'PON_AQUI_TU_PROJECT_ID',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'PON_AQUI_TU_STORAGE_BUCKET',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'PON_AQUI_TU_SENDER_ID',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'PON_AQUI_TU_APP_ID',
};

export default firebaseConfig;