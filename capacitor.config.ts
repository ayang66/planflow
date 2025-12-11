import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.planflow.app',
  appName: 'planflow1.0',
  webDir: 'dist',
  // 开发时允许 HTTP 请求（Android 默认只允许 HTTPS）
  android: {
    allowMixedContent: true,
  },
  server: {
    // 开发时可以启用 cleartext（HTTP）
    cleartext: true,
  }
};

export default config;
