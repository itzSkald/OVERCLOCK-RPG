import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.overclock.exe',
  appName: 'OVERCLOCK.EXE',
  webDir: 'dist',
  server: {
    // Allow loading from the local file system
    androidScheme: 'https',
  },
  plugins: {
    App: {
      // Handle app state changes for save persistence
    },
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    backgroundColor: '#0a0a0f',
  },
};

export default config;
