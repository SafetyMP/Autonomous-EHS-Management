/**
 * Curated HCS 2024 / EPCRA 2027 hazard class+category allowlist for programme inventory.
 * Not a substitute for Tier2 Submit or EPA e-filing. See docs/regulatory/epcra-hazard-categories-2027.md.
 */

export const EPCRA_HAZARD_CATALOG_VERSION = "2027-epcra-hcs-2024" as const;

export type EpcraHazardDomain = "health" | "physical";

export type EpcraHazardEntry = {
  domain: EpcraHazardDomain;
  hazardClass: string;
  categories: readonly string[];
};

/** Representative allowlist aligned with OSHA HCS classes used for EPCRA 311/312. */
export const EPCRA_HAZARD_CATALOG: readonly EpcraHazardEntry[] = [
  {
    domain: "health",
    hazardClass: "Acute toxicity - Oral",
    categories: ["Category 1", "Category 2", "Category 3", "Category 4"],
  },
  {
    domain: "health",
    hazardClass: "Acute toxicity - Dermal",
    categories: ["Category 1", "Category 2", "Category 3", "Category 4"],
  },
  {
    domain: "health",
    hazardClass: "Acute toxicity - Inhalation (Gases)",
    categories: ["Category 1", "Category 2", "Category 3", "Category 4"],
  },
  {
    domain: "health",
    hazardClass: "Acute toxicity - Inhalation (Vapors)",
    categories: ["Category 1", "Category 2", "Category 3", "Category 4"],
  },
  {
    domain: "health",
    hazardClass: "Acute toxicity - Inhalation (Dusts and Mists)",
    categories: ["Category 1", "Category 2", "Category 3", "Category 4"],
  },
  {
    domain: "health",
    hazardClass: "Skin corrosion/irritation",
    categories: ["Category 1A", "Category 1B", "Category 1C", "Category 2"],
  },
  {
    domain: "health",
    hazardClass: "Serious eye damage/eye irritation",
    categories: ["Category 1", "Category 2A", "Category 2B"],
  },
  {
    domain: "health",
    hazardClass: "Respiratory sensitization",
    categories: ["Category 1", "Category 1A", "Category 1B"],
  },
  {
    domain: "health",
    hazardClass: "Skin sensitization",
    categories: ["Category 1", "Category 1A", "Category 1B"],
  },
  {
    domain: "health",
    hazardClass: "Germ cell mutagenicity",
    categories: ["Category 1A", "Category 1B", "Category 2"],
  },
  {
    domain: "health",
    hazardClass: "Carcinogenicity",
    categories: ["Category 1A", "Category 1B", "Category 2"],
  },
  {
    domain: "health",
    hazardClass: "Reproductive toxicity",
    categories: ["Category 1A", "Category 1B", "Category 2", "Effects on or via lactation"],
  },
  {
    domain: "health",
    hazardClass: "Specific target organ toxicity - Single exposure",
    categories: ["Category 1", "Category 2", "Category 3"],
  },
  {
    domain: "health",
    hazardClass: "Specific target organ toxicity - Repeated exposure",
    categories: ["Category 1", "Category 2"],
  },
  {
    domain: "health",
    hazardClass: "Aspiration hazard",
    categories: ["Category 1"],
  },
  {
    domain: "health",
    hazardClass: "Simple asphyxiant",
    categories: ["Simple Asphyxiant"],
  },
  {
    domain: "health",
    hazardClass: "Hazard not otherwise classified (HNOC)",
    categories: ["HNOC"],
  },
  {
    domain: "physical",
    hazardClass: "Explosives",
    categories: [
      "Unstable Explosive",
      "Division 1.1",
      "Division 1.2",
      "Division 1.3",
      "Division 1.4",
      "Division 1.5",
      "Division 1.6",
    ],
  },
  {
    domain: "physical",
    hazardClass: "Flammable gases",
    categories: [
      "Category 1A",
      "Category 1B",
      "Category 2",
      "Pyrophoric Gas - Category 1A",
      "Chemically Unstable Gas - Category 1A/A",
      "Chemically Unstable Gas - Category 1A/B",
    ],
  },
  {
    domain: "physical",
    hazardClass: "Aerosols",
    categories: ["Category 1", "Category 2", "Category 3"],
  },
  {
    domain: "physical",
    hazardClass: "Chemicals under pressure",
    categories: ["Category 1", "Category 2", "Category 3"],
  },
  {
    domain: "physical",
    hazardClass: "Oxidizing gases",
    categories: ["Category 1"],
  },
  {
    domain: "physical",
    hazardClass: "Gases under pressure",
    categories: [
      "Compressed gas",
      "Liquefied gas",
      "Refrigerated liquefied gas",
      "Dissolved gas",
    ],
  },
  {
    domain: "physical",
    hazardClass: "Flammable liquids",
    categories: ["Category 1", "Category 2", "Category 3", "Category 4"],
  },
  {
    domain: "physical",
    hazardClass: "Flammable solids",
    categories: ["Category 1", "Category 2"],
  },
  {
    domain: "physical",
    hazardClass: "Self-reactive chemicals",
    categories: ["Type A", "Type B", "Type C", "Type D", "Type E", "Type F", "Type G"],
  },
  {
    domain: "physical",
    hazardClass: "Pyrophoric liquids",
    categories: ["Category 1"],
  },
  {
    domain: "physical",
    hazardClass: "Pyrophoric solids",
    categories: ["Category 1"],
  },
  {
    domain: "physical",
    hazardClass: "Self-heating chemicals",
    categories: ["Category 1", "Category 2"],
  },
  {
    domain: "physical",
    hazardClass: "Chemicals which, in contact with water, emit flammable gases",
    categories: ["Category 1", "Category 2", "Category 3"],
  },
  {
    domain: "physical",
    hazardClass: "Oxidizing liquids",
    categories: ["Category 1", "Category 2", "Category 3"],
  },
  {
    domain: "physical",
    hazardClass: "Oxidizing solids",
    categories: ["Category 1", "Category 2", "Category 3"],
  },
  {
    domain: "physical",
    hazardClass: "Organic peroxides",
    categories: ["Type A", "Type B", "Type C", "Type D", "Type E", "Type F", "Type G"],
  },
  {
    domain: "physical",
    hazardClass: "Corrosive to metals",
    categories: ["Category 1"],
  },
  {
    domain: "physical",
    hazardClass: "Desensitized explosives",
    categories: ["Category 1", "Category 2", "Category 3", "Category 4"],
  },
  {
    domain: "physical",
    hazardClass: "Combustible dust",
    categories: ["Combustible Dust"],
  },
  {
    domain: "physical",
    hazardClass: "Hazard not otherwise classified (HNOC)",
    categories: ["HNOC"],
  },
] as const;

export function categoriesForHazardClass(hazardClass: string): readonly string[] {
  const entry = EPCRA_HAZARD_CATALOG.find((e) => e.hazardClass === hazardClass);
  return entry?.categories ?? [];
}

export function domainForHazardClass(hazardClass: string): EpcraHazardDomain | null {
  const entry = EPCRA_HAZARD_CATALOG.find((e) => e.hazardClass === hazardClass);
  return entry?.domain ?? null;
}

export function isValidEpcraHazardPair(hazardClass: string, hazardCategory: string): boolean {
  return categoriesForHazardClass(hazardClass).includes(hazardCategory);
}

export const EPCRA_HAZARD_CLASS_OPTIONS = EPCRA_HAZARD_CATALOG.map((e) => e.hazardClass);
