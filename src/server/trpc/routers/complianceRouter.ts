import { router } from "../init";
import { chemicalInventoryRouter } from "./chemicalInventoryRouter";
import { dataRetentionRouter } from "./dataRetentionRouter";
import { dsarRouter } from "./dsarRouter";
import { establishmentRouter } from "./establishmentRouter";
import { regulatoryOshaRouter } from "./regulatoryOshaRouter";

/** Compliance governance: establishments, OSHA sidecar, retention policies, Tier II inventory, DSAR intake. */
export const complianceRouter = router({
  establishment: establishmentRouter,
  regulatoryOsha: regulatoryOshaRouter,
  dataRetention: dataRetentionRouter,
  chemicalInventory: chemicalInventoryRouter,
  dsar: dsarRouter,
});
