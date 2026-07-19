import type { MetadataRoute } from "next";

/**
 * Installable progressive-web shell for field shortcut (ADR-UX-003 / AC-009).
 * Not a native App Store / Play Store client — D-006 remains blocked.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Autonomous EHS — ISO 45001- & 14001-style IMS",
    short_name: "EHS Console",
    description:
      "Installable web EHS Console — incident, CAPA, and environmental management with human approval for material changes. Responsive progressive web; not a native mobile store app.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#fafafa",
    theme_color: "#059669",
    icons: [
      {
        src: "/file.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
    ],
  };
}
