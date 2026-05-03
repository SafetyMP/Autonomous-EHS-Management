import type { MetadataRoute } from "next";

/** PWA shell for field install (see UI competitive positioning — installable web client). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EHS Management — ISO 45001 & 14001",
    short_name: "EHS",
    description:
      "Occupational health, safety, and environmental management system of record.",
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
