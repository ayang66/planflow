import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.planflow.app',
  appName: 'planflow1.0',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
  server: {
    cleartext: true,
    androidScheme: 'http',
  },
  ios: {
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
};

export default config;
