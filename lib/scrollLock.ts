/**
 * Global Reference-Counted Scroll Lock Manager
 *
 * Coordinates modal dialogues, slide-over drawers, and mobile navigation sheets
 * to ensure:
 * 1. Background page scrolling is locked when at least one overlay is open.
 * 2. Background page scrolling is cleanly restored when all overlays close.
 * 3. Never leaves document.body.style.overflow in a stale 'hidden' state.
 */

let lockCount = 0;

export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return;
  lockCount++;
  if (lockCount === 1) {
    document.body.style.overflow = 'hidden';
  }
}

export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = '';
  }
}

export function forceResetBodyScroll(): void {
  if (typeof document === 'undefined') return;
  lockCount = 0;
  document.body.style.overflow = '';
}

export function getScrollLockCount(): number {
  return lockCount;
}
