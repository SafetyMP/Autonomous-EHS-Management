import { z } from "zod";

/** Shared `{ organizationId: uuid }` input for multi-tenant tRPC procedures. */
export const orgScope = z.object({
  organizationId: z.string().uuid(),
});
