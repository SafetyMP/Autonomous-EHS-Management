import { describe, expect, it, beforeEach, vi } from "vitest";
import { PRODUCT_RELEASE_ID } from "@/lib/dashboard/productHighlights";
import {
  isWhatsNewBannerVisible,
  readWhatsNewDismissedRelease,
  writeWhatsNewDismissedRelease,
} from "@/lib/dashboard/whatsNewDismiss";

function createLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
}

describe("whatsNewDismiss", () => {
  beforeEach(() => {
    const storage = createLocalStorageMock();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", { localStorage: storage });
  });

  it("shows banner when nothing dismissed", () => {
    expect(readWhatsNewDismissedRelease()).toBeNull();
    expect(isWhatsNewBannerVisible()).toBe(true);
  });

  it("hides banner after dismiss for current release", () => {
    writeWhatsNewDismissedRelease();
    expect(readWhatsNewDismissedRelease()).toBe(PRODUCT_RELEASE_ID);
    expect(isWhatsNewBannerVisible()).toBe(false);
  });

  it("shows banner again when release id changes", () => {
    writeWhatsNewDismissedRelease("older-release");
    expect(isWhatsNewBannerVisible()).toBe(true);
  });
});
