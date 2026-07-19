/**
 * ISO 14001:2026 Clause 4.1 named environmental conditions for context analysis.
 * Programme aid — not a certification determination.
 */
export const ISO14001_ENVIRONMENTAL_CONDITIONS = [
  "climate_change",
  "biodiversity",
  "ecosystem_health",
  "pollution_levels",
  "natural_resource_availability",
] as const;

export type Iso14001EnvironmentalCondition =
  (typeof ISO14001_ENVIRONMENTAL_CONDITIONS)[number];

export const ISO14001_ENVIRONMENTAL_CONDITION_LABELS: Record<
  Iso14001EnvironmentalCondition,
  string
> = {
  climate_change: "Climate change",
  biodiversity: "Biodiversity",
  ecosystem_health: "Ecosystem health",
  pollution_levels: "Pollution levels",
  natural_resource_availability: "Natural resource availability",
};

export function isIso14001EnvironmentalCondition(
  value: string,
): value is Iso14001EnvironmentalCondition {
  return (ISO14001_ENVIRONMENTAL_CONDITIONS as readonly string[]).includes(value);
}
