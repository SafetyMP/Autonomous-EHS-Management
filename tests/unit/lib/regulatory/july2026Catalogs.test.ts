import { describe, expect, it } from "vitest";
import {
  HEAT_NEP_CHECK_KEYS,
  HEAT_NEP_CHECKLIST_VERSION,
  isHeatNepCheckKey,
} from "@/lib/regulatory/heatNepAppendixI";
import {
  EPCRA_HAZARD_CATALOG,
  isValidEpcraHazardPair,
} from "@/lib/regulatory/epcraHazardCategories2027";
import {
  ISO14001_ENVIRONMENTAL_CONDITIONS,
  isIso14001EnvironmentalCondition,
} from "@/lib/regulatory/iso14001EnvironmentalConditions";

describe("July 2026 regulatory catalogs", () => {
  it("exposes a complete Heat NEP Appendix I checklist", () => {
    expect(HEAT_NEP_CHECKLIST_VERSION).toContain("2026");
    expect(HEAT_NEP_CHECK_KEYS.length).toBeGreaterThanOrEqual(11);
    expect(isHeatNepCheckKey("cool_water_access")).toBe(true);
    expect(isHeatNepCheckKey("not_a_real_key")).toBe(false);
  });

  it("validates EPCRA/HCS hazard class+category pairs", () => {
    expect(EPCRA_HAZARD_CATALOG.length).toBeGreaterThan(20);
    expect(isValidEpcraHazardPair("Aerosols", "Category 1")).toBe(true);
    expect(isValidEpcraHazardPair("Aerosols", "Category 99")).toBe(false);
  });

  it("lists ISO 14001:2026 environmental conditions", () => {
    expect(ISO14001_ENVIRONMENTAL_CONDITIONS).toContain("climate_change");
    expect(ISO14001_ENVIRONMENTAL_CONDITIONS).toContain("biodiversity");
    expect(isIso14001EnvironmentalCondition("pollution_levels")).toBe(true);
    expect(isIso14001EnvironmentalCondition("workforce")).toBe(false);
  });
});
