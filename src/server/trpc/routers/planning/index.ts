import { router } from "../../init";
import { hazardRouter } from "./hazardRouter";
import { kpiRouter } from "./kpiRouter";
import { objectiveRouter } from "./objectiveRouter";
import { operationalControlRouter } from "./controlRouter";
import { riskRouter } from "./riskRouter";

export const planningRouter = router({
  hazard: hazardRouter,
  risk: riskRouter,
  objective: objectiveRouter,
  kpi: kpiRouter,
  operationalControl: operationalControlRouter,
});
