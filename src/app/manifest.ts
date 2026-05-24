import type { MetadataRoute } from "next";

/** PWA shell for field install (see UI competitive positioning — installable web client). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Autonomous EHS — ISO 45001 & 14001 IMS",
    short_name: "EHS Console",
    description:
      "Autonomous compliance operations platform — incident, CAPA, and environmental management with human approval for material changes.",
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
