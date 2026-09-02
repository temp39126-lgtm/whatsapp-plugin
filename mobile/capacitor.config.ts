import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'app.whatsappcrm',
  appName: 'WhatsApp CRM',
  webDir: 'www',
  server: serverUrl
    ? {
        url: serverUrl,
        androidScheme: 'https',
        cleartext: false,
      }
    : undefined,
  android: {
    allowMixedContent: false,
    backgroundColor: '#128C7E',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#128C7E',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#075E54',
    },
  },
};

export default config;
