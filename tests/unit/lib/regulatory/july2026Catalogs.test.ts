import { describe, expect, it } from "vitest";
import {
  HEAT_NEP_CHECK_KEYS,
  HEAT_NEP_CHECKLIST_VERSION,
  isHeatNepCheckKey,
} from "@/lib/regulatory/heatNepAppendixI";
import {
  assertUniqueEpcraHazardClasses,
  domainForHazardClass,
  EPCRA_HAZARD_CATALOG,
  EPCRA_HAZARD_CATALOG_VERSION,
  EPCRA_HAZARD_CLASS_OPTIONS,
  isValidEpcraHazardPair,
} from "@/lib/regulatory/epcraHazardCategories2027";
import {
  ISO14001_ENVIRONMENTAL_CONDITIONS,
  isIso14001EnvironmentalCondition,
} from "@/lib/regulatory/iso14001EnvironmentalConditions";
import { ASPECT_LIFECYCLE_STAGES } from "@/lib/ehs-enums";

describe("July 2026 regulatory catalogs", () => {
  it("exposes the exact Heat NEP Appendix I checklist (11 keys)", () => {
    expect(HEAT_NEP_CHECKLIST_VERSION).toBe("2026-04-cpl-03-00-024");
    expect([...HEAT_NEP_CHECK_KEYS]).toEqual([
      "written_heat_program",
      "heat_monitoring",
      "cool_water_access",
      "shade_or_cool_rest",
      "scheduled_rest_breaks",
      "acclimatization",
      "administrative_controls",
      "worker_training",
      "supervisor_training",
      "emergency_response",
      "employee_understanding",
    ]);
    expect(isHeatNepCheckKey("cool_water_access")).toBe(true);
    expect(isHeatNepCheckKey("not_a_real_key")).toBe(false);
  });

  it("validates EPCRA/HCS hazard class+category pairs with unique class labels", () => {
    expect(EPCRA_HAZARD_CATALOG_VERSION).toBe("2027-epcra-hcs-2024");
    expect(EPCRA_HAZARD_CATALOG.length).toBeGreaterThan(20);
    expect(() => assertUniqueEpcraHazardClasses()).not.toThrow();
    expect(new Set(EPCRA_HAZARD_CLASS_OPTIONS).size).toBe(EPCRA_HAZARD_CLASS_OPTIONS.length);
    expect(isValidEpcraHazardPair("Aerosols", "Category 1")).toBe(true);
    expect(isValidEpcraHazardPair("Aerosols", "Category 99")).toBe(false);
    expect(domainForHazardClass("Hazard not otherwise classified (HNOC) - Health")).toBe(
      "health",
    );
    expect(domainForHazardClass("Hazard not otherwise classified (HNOC) - Physical")).toBe(
      "physical",
    );
    expect(domainForHazardClass("Hazard not otherwise classified (HNOC)")).toBeNull();
  });

  it("lists the exact ISO 14001:2026 environmental conditions set", () => {
    expect([...ISO14001_ENVIRONMENTAL_CONDITIONS]).toEqual([
      "climate_change",
      "biodiversity",
      "ecosystem_health",
      "pollution_levels",
      "natural_resource_availability",
    ]);
    expect(isIso14001EnvironmentalCondition("pollution_levels")).toBe(true);
    expect(isIso14001EnvironmentalCondition("workforce")).toBe(false);
  });

  it("exposes aspect lifecycle stages for ISO 14001:2026 programme aids", () => {
    expect([...ASPECT_LIFECYCLE_STAGES]).toEqual([
      "raw_material",
      "operations",
      "transport",
      "disposal",
      "other",
    ]);
  });
});
