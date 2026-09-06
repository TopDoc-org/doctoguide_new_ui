import { Injectable, signal } from '@angular/core';

/**
 * The overlay stack, and the body scroll lock that follows from it.
 *
 * WHY A STACK AND NOT A BOOLEAN.
 *
 * /triage can have three overlays open at once — the account drawer, the auth
 * gate on top of it, the leave-chat confirm on top of that. Two things break
 * if each overlay reasons about itself in isolation:
 *
 *  1. Escape closes ALL of them at once, because every open overlay has a
 *     `document:keydown.escape` listener and they all fire on one keypress.
 *  2. The scroll lock is a single `document.body.style.overflow` string. The
 *     first overlay to close writes '' back, unlocking the page while two
 *     overlays are still open — the classic "background scrolls behind the
 *     modal" bug, and it only appears when overlays nest, which is why it
 *     survives casual testing.
 *
 * So: overlays register here on open and deregister on close. Escape is only
 * honoured by whoever is on top, and the lock is refcounted by stack depth.
 *
 * This deliberately mirrors `core/native/back-button.service.ts`, which solves
 * the same ordering problem for the Android hardware back button. The two are
 * separate because they close different things — back-button also handles
 * history and app exit — but a new overlay must be registered with BOTH.
 */
@Injectable({ providedIn: 'root' })
export class OverlayStackService {
  /** Newest last. Identity only — the tokens are the directive instances. */
  private stack: object[] = [];

  /** Exposed for anything that needs to know an overlay is up (e.g. hiding a FAB). */
  readonly depth = signal(0);

  /** The body's own overflow before we touched it, so we restore rather than assume. */
  private previousOverflow: string | null = null;
  private previousPaddingRight: string | null = null;

  push(token: object): void {
    if (this.stack.includes(token)) return;
    this.stack.push(token);
    this.depth.set(this.stack.length);
    if (this.stack.length === 1) this.lock();
  }

  pop(token: object): void {
    const i = this.stack.indexOf(token);
    if (i === -1) return;
    this.stack.splice(i, 1);
    this.depth.set(this.stack.length);
    if (this.stack.length === 0) this.unlock();
  }

  /** True when `token` is the topmost overlay, i.e. the one Escape should close. */
  isTop(token: object): boolean {
    return this.stack.length > 0 && this.stack[this.stack.length - 1] === token;
  }

  private lock(): void {
    if (typeof document === 'undefined') return;
    const body = document.body;
    this.previousOverflow = body.style.overflow;
    this.previousPaddingRight = body.style.paddingRight;

    // Hiding the scrollbar reflows the page a few px wider. On a phone the
    // scrollbar is an overlay and this is 0; on a desktop it is ~15px, and
    // without the compensation every fixed header visibly jumps left when a
    // dialog opens and back when it closes.
    const gap = window.innerWidth - document.documentElement.clientWidth;
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    body.style.overflow = 'hidden';
  }

  private unlock(): void {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = this.previousOverflow ?? '';
    document.body.style.paddingRight = this.previousPaddingRight ?? '';
    this.previousOverflow = null;
    this.previousPaddingRight = null;
  }
}
