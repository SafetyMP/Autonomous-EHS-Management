import { router } from "../init";
import { auditTrailRouter } from "./auditTrailRouter";
import { chemicalInventoryRouter } from "./chemicalInventoryRouter";
import { complianceMetricsRouter } from "./complianceMetricsRouter";
import { dataRetentionRouter } from "./dataRetentionRouter";
import { dsarRouter } from "./dsarRouter";
import { establishmentRouter } from "./establishmentRouter";
import { regulatoryOshaRouter } from "./regulatoryOshaRouter";
import { workflowCatalogRouter } from "./workflowCatalogRouter";

/** Compliance governance: establishments, OSHA sidecar, retention policies, Tier II inventory, DSAR intake. */
export const complianceRouter = router({
  auditTrail: auditTrailRouter,
  establishment: establishmentRouter,
  regulatoryOsha: regulatoryOshaRouter,
  workflowCatalog: workflowCatalogRouter,
  dataRetention: dataRetentionRouter,
  chemicalInventory: chemicalInventoryRouter,
  dsar: dsarRouter,
  metrics: complianceMetricsRouter,
});
