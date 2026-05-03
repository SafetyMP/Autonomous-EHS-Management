import { router } from "../init";
import { chemicalInventoryRouter } from "./chemicalInventoryRouter";
import { dataRetentionRouter } from "./dataRetentionRouter";
import { establishmentRouter } from "./establishmentRouter";
import { regulatoryOshaRouter } from "./regulatoryOshaRouter";

/** Compliance governance: establishments, OSHA sidecar, retention policies, Tier II inventory. */
export const complianceRouter = router({
  establishment: establishmentRouter,
  regulatoryOsha: regulatoryOshaRouter,
  dataRetention: dataRetentionRouter,
  chemicalInventory: chemicalInventoryRouter,
});
