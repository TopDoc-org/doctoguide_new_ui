import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  // PERMANENT once published to Play — changing it later means a new listing
  // and losing existing installs. Mirrors the sibling app's in.knocdoc.app.doctribe.
  appId: 'in.knocdoc.app.doctoguide',
  appName: 'DoctoGuide',

  // The `capacitor` build configuration's outputPath, NOT the web one.
  // dist/doctoguide/browser is prerendered: shipping it would put 22 static
  // HTML files in the APK and serve a stale homepage before the router boots.
  webDir: 'dist/doctoguide-app/browser',

  server: {
    // Serves the app from https://localhost inside the WebView. Required so
    // that WhatsApp / Instagram deep links leave the WebView to the system
    // handler instead of being trapped.
    androidScheme: 'https',
  },

  plugins: {
    Keyboard: {
      // The triage composer manages its own layout inside a 100dvh flex column.
      // Letting the WebView resize on focus fights that and pushes the chat
      // thread off-screen.
      resize: KeyboardResize.None,
      // DoctoGuide is a light-only UI (see ThemeService: no toggle is exposed).
      style: KeyboardStyle.Light,
    },
  },
};

export default config;
