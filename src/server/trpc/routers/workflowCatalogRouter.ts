import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { buildEncodedWorkflowCatalog } from "@/lib/workflow/catalog";
import { orgScope } from "../schemas/orgScope";
import { protectedProcedure, router } from "../init";

/** Read-only encoded workflow transitions for documentation and RFP transparency. */
export const workflowCatalogRouter = router({
  get: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.RETENTION_POLICY_READ,
    );
    return buildEncodedWorkflowCatalog();
  }),
});
