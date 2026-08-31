/**
 * Browser-only blob download. No-op during prerender/SSR.
 *
 * Replaces a block that was duplicated verbatim in five console components
 * (admin-leads, owner-campaigns, owner-clinics, partner-campaigns,
 * partner-leads). Uses bare `URL.createObjectURL`, not `window.URL.*`, so no
 * extra window guard is needed.
 *
 * KNOWN LIMITATION, deliberately preserved: blob + <a download> does not
 * reliably save to disk inside an Android WebView. v1 had the same limitation
 * (it never shipped an APK), so this keeps parity. Do not "fix" it here — see
 * the CSV-export note in the migration plan.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
