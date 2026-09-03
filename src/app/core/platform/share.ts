/**
 * Share text through the OS share sheet.
 *
 * Three tiers, because no single one covers the platforms this app ships on:
 *   1. Capacitor's Share plugin — the ONLY one that works in the APK. Android
 *      WebView does not implement `navigator.share`, so a web-only path falls
 *      through to its own failure branch on every device the APK runs on.
 *   2. `navigator.share` — mobile browsers.
 *   3. the clipboard — desktop browsers have no share sheet at all.
 *
 * The plugin is read off the runtime global rather than imported from
 * @capacitor/share, matching back-button.service: the web bundle then carries
 * no native import and this module stays inert in a browser. Capacitor
 * populates `Capacitor.Plugins` from the native bridge for every registered
 * plugin, so no JS-side import is needed for the proxy to exist.
 */

type ShareResult = 'shared' | 'copied' | 'unavailable';

interface CapacitorShare {
  share(options: { title?: string; text?: string; dialogTitle?: string }): Promise<unknown>;
}

function nativeShare(): CapacitorShare | undefined {
  return (globalThis as { Capacitor?: { Plugins?: { Share?: CapacitorShare } } }).Capacitor?.Plugins
    ?.Share;
}

export async function shareText(data: { title: string; text: string }): Promise<ShareResult> {
  if (typeof window === 'undefined') return 'unavailable';

  const plugin = nativeShare();
  if (plugin) {
    try {
      await plugin.share({ title: data.title, text: data.text, dialogTitle: data.title });
      return 'shared';
    } catch {
      // The user dismissing the sheet rejects too. Either way there is nothing
      // left to do — falling through to a clipboard copy would be surprising.
      return 'shared';
    }
  }

  const webShare = (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share;
  if (webShare) {
    try {
      await webShare.call(navigator, { title: data.title, text: data.text });
      return 'shared';
    } catch {
      return 'shared';
    }
  }

  try {
    await navigator.clipboard.writeText(data.text);
    return 'copied';
  } catch {
    return 'unavailable';
  }
}
