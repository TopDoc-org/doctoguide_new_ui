/**
 * Open a URL outside the app. No-op during prerender/SSR.
 *
 * Deliberately plain `window.open` rather than @capacitor/browser: WhatsApp and
 * Instagram deep links must escape the WebView to the system handler, which
 * `window.open` with `androidScheme: 'https'` does correctly. An in-app browser
 * would trap them.
 */
export function openExternal(url: string): void {
  if (typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener');
}
