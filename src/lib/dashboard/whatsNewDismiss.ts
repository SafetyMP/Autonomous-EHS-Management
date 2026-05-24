import { PRODUCT_RELEASE_ID } from "@/lib/dashboard/productHighlights";

const STORAGE_KEY = "ehs-whats-new-dismissed";

export function readWhatsNewDismissedRelease(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeWhatsNewDismissedRelease(releaseId: string = PRODUCT_RELEASE_ID): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, releaseId);
  } catch {
    /* ignore */
  }
}

export function isWhatsNewBannerVisible(): boolean {
  return readWhatsNewDismissedRelease() !== PRODUCT_RELEASE_ID;
}
