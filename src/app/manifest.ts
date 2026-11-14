import type { MetadataRoute } from "next";

/**
 * Installable progressive-web shell for field shortcut (ADR-UX-003 / AC-009).
 * Not a native App Store / Play Store client — D-006 remains blocked.
 * Colors align with ADR-UX-005 Calm Focus tokens (`--background`, `--primary`).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Autonomous EHS — Corporate EHS Console",
    short_name: "EHS Console",
    description:
      "Corporate EHS Console for incidents, corrective actions, audits, and environmental programmes. Installable web application with role-based access and human approval.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8fafc",
    theme_color: "#0f766e",
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
