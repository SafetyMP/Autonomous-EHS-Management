/**
 * Shared Tailwind classes for dashboard field UX (WCAG-friendly touch targets + focus rings).
 */

/** Shared field chrome without forcing full width (use in flex toolbars alongside buttons). */
export const dfControlFlexible =
  "min-h-11 rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm";

export const dfControl = `w-full ${dfControlFlexible}`;

export const dfControlMt = `mt-1 ${dfControl}`;

export const dfSectionHeading =
  "text-sm font-semibold uppercase tracking-wide text-zinc-800";

export const dfPanelHeading = "text-base font-semibold text-zinc-900";

export const dfMuted = "text-sm text-zinc-700";

export const dfHelper = "text-sm text-zinc-700";

export const dfHelperXs = "text-xs text-zinc-700";

export const dfPanelMinor =
  "text-xs font-semibold uppercase tracking-wide text-zinc-800";

export const dfLabel =
  "block text-sm font-semibold text-zinc-900";

export const dfMonoBlock =
  "mt-3 min-h-[8rem] w-full rounded-md border border-zinc-300 bg-white px-3 py-3 font-mono text-sm leading-relaxed text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-base";

export const dfTableCaption = "sr-only";

export const dfTableHead =
  "bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-800";

export const dfPrimarySubmit =
  "min-h-11 touch-target rounded-md bg-emerald-800 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

export const dfSecondaryOutline =
  "min-h-11 touch-target rounded-md border-2 border-zinc-400 bg-white px-4 py-2 text-base font-semibold text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

/** Inline link with visible focus ring and tap padding */
export const dfInlineNavLink =
  "inline-flex min-h-[2.75rem] items-center font-semibold text-emerald-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 rounded-sm px-1 text-sm";

/** Controls on amber-tinted surfaces (AI drafts) */
export const dfControlAmber =
  "min-h-11 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-base text-amber-950 shadow-sm focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-600 sm:text-sm";

export const dfAmberPrimary =
  "min-h-11 touch-target rounded-md bg-amber-900 px-4 py-2 text-base font-semibold text-white hover:bg-amber-950 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2";

export const dfAmberSecondary =
  "min-h-11 touch-target rounded-md border-2 border-amber-800 bg-white px-4 py-2 text-base font-semibold text-amber-950 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2";

export const dfAmberGhost =
  "min-h-11 touch-target rounded-md px-4 py-2 text-base font-semibold text-amber-950 underline-offset-4 hover:bg-amber-100/60 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2";

