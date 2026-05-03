/* eslint-disable @typescript-eslint/no-unused-vars -- chain signatures mirror Drizzle stubs */
/**
 * Test doubles for Drizzle-style chained queries.
 *
 * Deliberately failing tests: Prefer fixing product code before merge. Reserve
 * `it.fails` only when a reproducible flaw is intentionally deferred — CI stays
 * green (`npm run verify`).
 */
import type { Db } from "@/server/db";
import {
  complianceObligation,
  controlledDocument,
  correctiveAction,
  incident,
  membership,
  ragChunk,
  site,
} from "@/server/db/schema";

type RbacRow = Record<string, unknown>;

function rbacMembershipFrom(rows: RbacRow[]) {
  const limitResolved = Promise.resolve(rows);
  return {
    innerJoin(..._ignored: unknown[]) {
      return {
        innerJoin(..._ignored2: unknown[]) {
          return {
            where(..._ignored3: unknown[]) {
              return {
                limit(): Promise<RbacRow[]> {
                  return limitResolved;
                },
              };
            },
          };
        },
      };
    },
  };
}

export function createRbacOnlyFakeDb(hit: boolean): Db {
  const rows = hit ? [{ pk: "grant" }] : ([] as RbacRow[]);
  return {
    select() {
      return {
        from(table: unknown) {
          if (table === membership) {
            return rbacMembershipFrom(rows as RbacRow[]);
          }
          throw new Error(`[fake-db] rbac-only: unsupported from(${String(table)})`);
        },
      };
    },
  } as unknown as Db;
}

export type IncidentCompositeFakeOpts = {
  rbacHit: boolean;
  listRows?: unknown[];
  existingIncident?: Record<string, unknown> | null;
};

/**
 * Stateless fake for RBAC joins + incident reads + transactional update inserts.
 * Mocks reflect how `incidentRouter` touches `ctx.db`.
 */
export function createIncidentCompositeFakeDb(opts: IncidentCompositeFakeOpts): Db {
  const rbacRows = opts.rbacHit ? ([{ pk: "grant" }] as RbacRow[]) : ([] as RbacRow[]);
  const listRows = opts.listRows ?? [];
  const existingIncident = opts.existingIncident ?? null;

  type Tx = {
    update: (table: unknown) => {
      set: (updates: Record<string, unknown>) => {
        where: () => { returning: () => Promise<Record<string, unknown>[]> };
      };
    };
    insert: (table: unknown) => { values: () => Promise<undefined> };
  };

  let lastReturning: Record<string, unknown>[] = [];

  function makeTx(existing: Record<string, unknown>): Tx {
    return {
      update(..._t: unknown[]) {
        return {
          set(updates: Record<string, unknown>) {
            lastReturning = [{ ...existing, ...updates }];
            return {
              where() {
                return {
                  returning() {
                    return Promise.resolve(lastReturning);
                  },
                };
              },
            };
          },
        };
      },
      insert(..._t: unknown[]) {
        return {
          values() {
            return Promise.resolve(undefined);
          },
        };
      },
    };
  }

  return {
    select() {
      return {
        from(table: unknown) {
          if (table === membership) {
            return rbacMembershipFrom(rbacRows);
          }
          if (table === incident) {
            return {
              where() {
                return {
                  limit() {
                    return Promise.resolve(existingIncident ? [existingIncident] : []);
                  },
                  orderBy() {
                    return Promise.resolve(listRows);
                  },
                };
              },
            };
          }
          throw new Error(`[fake-db] unsupported from(${String(table)})`);
        },
      };
    },

    transaction: async <T>(callback: (tx: Tx) => Promise<T>): Promise<T> => {
      if (!existingIncident) {
        throw new Error("[fake-db] transaction called without existingIncident");
      }
      lastReturning = [];
      return callback(makeTx({ ...existingIncident }));
    },
  } as unknown as Db;
}

export type ListEntityFakeOpts = {
  rbacHit: boolean;
  entityTable: unknown;
  listRows: unknown[];
};

/**
 * Minimal fake for routers that resolve `await db.select().from(entity)...where(...)`
 * and optionally `.orderBy(...)`. Covers membership RBAC joins used by assertPermission.
 */
export function createListEntityFakeDb(opts: ListEntityFakeOpts): Db {
  const rbacRows = opts.rbacHit ? ([{ pk: "grant" }] as RbacRow[]) : ([] as RbacRow[]);
  const resolved = Promise.resolve(opts.listRows);

  return {
    select() {
      return {
        from(table: unknown) {
          if (table === membership) {
            return rbacMembershipFrom(rbacRows as RbacRow[]);
          }
          if (table === opts.entityTable) {
            return {
              where(..._ignored: unknown[]) {
                return {
                  orderBy(..._ignored2: unknown[]) {
                    return resolved;
                  },
                  then<TResult1>(
                    onfulfilled?:
                      | ((value: unknown[]) => TResult1 | PromiseLike<TResult1>)
                      | null
                      | undefined,
                    onrejected?: ((reason: unknown) => unknown) | null | undefined,
                  ): Promise<TResult1> {
                    return resolved.then(onfulfilled ?? undefined, onrejected ?? undefined) as Promise<TResult1>;
                  },
                };
              },
            };
          }
          throw new Error(`[fake-db] list-entity: unsupported from(${String(table)})`);
        },
      };
    },
  } as unknown as Db;
}

export type DocumentGetFakeOpts = {
  rbacHit: boolean;
  /** When null, `.limit(1)` resolves to empty (NOT_FOUND paths). */
  row: Record<string, unknown> | null;
};

/**
 * RBAC membership join + controlled document keyed fetch (`where` + `limit(1)`).
 */
export function createDocumentGetFakeDb(opts: DocumentGetFakeOpts): Db {
  const rbacRows = opts.rbacHit ? ([{ pk: "grant" }] as RbacRow[]) : ([] as RbacRow[]);
  const bucket = opts.row ? [opts.row] : ([] as Record<string, unknown>[]);
  const oneResolved = Promise.resolve(bucket);

  return {
    select() {
      return {
        from(table: unknown) {
          if (table === membership) {
            return rbacMembershipFrom(rbacRows as RbacRow[]);
          }
          if (table === controlledDocument) {
            return {
              where(..._ignored: unknown[]) {
                const tail = {
                  limit() {
                    return oneResolved;
                  },
                  then<TResult1>(
                    onfulfilled?:
                      | ((value: unknown[]) => TResult1 | PromiseLike<TResult1>)
                      | null
                      | undefined,
                    onrejected?: ((reason: unknown) => unknown) | null | undefined,
                  ): Promise<TResult1> {
                    return oneResolved.then(onfulfilled ?? undefined, onrejected ?? undefined) as Promise<TResult1>;
                  },
                };
                return tail;
              },
            };
          }
          throw new Error(`[fake-db] document-get: unsupported from(${String(table)})`);
        },
      };
    },
  } as unknown as Db;
}

type OrgMineRow = { id: string; name: string };

/**
 * Membership ⟕ organization rows for {@link organizationRouter.mine} (no RBAC permission table).
 */
export function createOrganizationMineFakeDb(rows: OrgMineRow[]): Db {
  const resolved = Promise.resolve(rows);

  return {
    select() {
      return {
        from(table: unknown) {
          if (table === membership) {
            return {
              innerJoin(..._ignored: unknown[]) {
                return {
                  where(..._ignored2: unknown[]) {
                    return {
                      then<TResult1>(
                        onfulfilled?:
                          | ((value: OrgMineRow[]) => TResult1 | PromiseLike<TResult1>)
                          | null
                          | undefined,
                        onrejected?: ((reason: unknown) => unknown) | null | undefined,
                      ): Promise<TResult1> {
                        return resolved.then(onfulfilled ?? undefined, onrejected ?? undefined) as Promise<TResult1>;
                      },
                    };
                  },
                };
              },
            };
          }
          throw new Error(`[fake-db] organization-mine: unsupported from(${String(table)})`);
        },
      };
    },
  } as unknown as Db;
}

export type OrganizationSitesFakeOpts = {
  memberHits: boolean;
  siteRows: unknown[];
};

/**
 * Sites listing: membership presence check then `site` rows.
 */
export function createOrganizationSitesFakeDb(opts: OrganizationSitesFakeOpts): Db {
  const membershipProbe = opts.memberHits ? ([{ id: "m1" }] as RbacRow[]) : ([] as RbacRow[]);
  const probeResolved = Promise.resolve(membershipProbe);
  const sitesResolved = Promise.resolve(opts.siteRows);

  return {
    select() {
      return {
        from(table: unknown) {
          if (table === membership) {
            return {
              where(..._ignored: unknown[]) {
                return {
                  limit() {
                    return probeResolved;
                  },
                };
              },
            };
          }
          if (table === site) {
            return {
              where(..._ignored: unknown[]) {
                const tail = {
                  then<TResult1>(
                    onfulfilled?:
                      | ((value: unknown[]) => TResult1 | PromiseLike<TResult1>)
                      | null
                      | undefined,
                    onrejected?: ((reason: unknown) => unknown) | null | undefined,
                  ): Promise<TResult1> {
                    return sitesResolved.then(onfulfilled ?? undefined, onrejected ?? undefined) as Promise<TResult1>;
                  },
                };
                return tail;
              },
            };
          }
          throw new Error(`[fake-db] organization-sites: unsupported from(${String(table)})`);
        },
      };
    },
  } as unknown as Db;
}

export type ObligationUpdateFakeOpts = {
  rbacHit: boolean;
  /** When null, `limit(1)` is empty → NOT_FOUND before any transaction. */
  existingObligation: Record<string, unknown> | null;
};

/**
 * RBAC + `complianceObligation` keyed fetch (`where` + `limit(1)`), then transactional `update.returning`.
 */
export function createObligationUpdateFakeDb(opts: ObligationUpdateFakeOpts): Db {
  const rbacRows = opts.rbacHit ? ([{ pk: "grant" }] as RbacRow[]) : ([] as RbacRow[]);
  const existing = opts.existingObligation;

  type Tx = {
    update: (table: unknown) => {
      set: (updates: Record<string, unknown>) => {
        where: () => { returning: () => Promise<Record<string, unknown>[]> };
      };
    };
  };

  let lastReturning: Record<string, unknown>[] = [];

  function makeTx(base: Record<string, unknown>): Tx {
    return {
      update(..._t: unknown[]) {
        return {
          set(updates: Record<string, unknown>) {
            lastReturning = [{ ...base, ...updates }];
            return {
              where() {
                return {
                  returning() {
                    return Promise.resolve(lastReturning);
                  },
                };
              },
            };
          },
        };
      },
    };
  }

  return {
    select() {
      return {
        from(table: unknown) {
          if (table === membership) {
            return rbacMembershipFrom(rbacRows as RbacRow[]);
          }
          if (table === complianceObligation) {
            return {
              where(..._ignored: unknown[]) {
                return {
                  limit() {
                    return Promise.resolve(existing ? [existing] : []);
                  },
                };
              },
            };
          }
          throw new Error(`[fake-db] obligation-update: unsupported from(${String(table)})`);
        },
      };
    },

    transaction: async <T>(callback: (tx: Tx) => Promise<T>): Promise<T> => {
      if (!existing) {
        throw new Error("[fake-db] obligation-update: unexpected transaction (no obligation row)");
      }
      lastReturning = [];
      return callback(makeTx({ ...existing }));
    },
  } as unknown as Db;
}

export type CapaStandaloneCreateFakeOpts = {
  rbacHit: boolean;
  /** Injected onto the single `insert(...).returning()` row (server sets `status: planned`). */
  createdId: string;
};

/** Standalone CAPA create: RBAC plus transaction `insert(correctiveAction).returning()`. No source FK lookups. */
export function createCapaStandaloneCreateFakeDb(opts: CapaStandaloneCreateFakeOpts): Db {
  const rbacRows = opts.rbacHit ? ([{ pk: "grant" }] as RbacRow[]) : ([] as RbacRow[]);

  type Tx = {
    insert: (table: unknown) => {
      values: (vals: Record<string, unknown>) => {
        returning: () => Promise<Record<string, unknown>[]>;
      };
    };
  };

  return {
    select() {
      return {
        from(table: unknown) {
          if (table === membership) {
            return rbacMembershipFrom(rbacRows as RbacRow[]);
          }
          throw new Error(`[fake-db] capa-create: unsupported from(${String(table)})`);
        },
      };
    },

    transaction: async <T>(callback: (tx: Tx) => Promise<T>): Promise<T> => {
      const tx: Tx = {
        insert(..._t: unknown[]) {
          return {
            values(vals: Record<string, unknown>) {
              return {
                returning() {
                  return Promise.resolve([
                    {
                      id: opts.createdId,
                      ...vals,
                      status: "planned",
                    },
                  ]);
                },
              };
            },
          };
        },
      };
      return callback(tx);
    },
  } as unknown as Db;
}

/**
 * `rag.backfillEmbeddings`: RBAC plus `select().from(ragChunk).where(...).limit(...)` yielding no rows → `{ updated: 0 }`.
 */
export function createRagBackfillEmptyFakeDb(rbacHit: boolean): Db {
  const rbacRows = rbacHit ? ([{ pk: "grant" }] as RbacRow[]) : ([] as RbacRow[]);

  return {
    select(..._cols: unknown[]) {
      return {
        from(table: unknown) {
          if (table === membership) {
            return rbacMembershipFrom(rbacRows as RbacRow[]);
          }
          if (table === ragChunk) {
            return {
              where(..._w: unknown[]) {
                return {
                  limit(..._l: unknown[]) {
                    return Promise.resolve([]);
                  },
                };
              },
            };
          }
          throw new Error(`[fake-db] rag-backfill: unsupported from(${String(table)})`);
        },
      };
    },
  } as unknown as Db;
}

/**
 * Fake DB for `analytics.safetyDashboard`: assertOrgMember uses `{ id: membership.id }`; RBAC uses `{ pk:
 * permission.key }`. Empty grants ⇒ null dashboard sections (no aggregation queries).
 */
export function createAnalyticsNoPermissionFakeDb(): Db {
  return {
    select(selection?: unknown) {
      const sel = selection as Record<string, unknown> | undefined;
      const isPermissionJoin =
        Boolean(sel && typeof sel === "object" && Object.keys(sel).includes("pk"));

      return {
        from(table: unknown) {
          if (table !== membership) {
            throw new Error(`[fake-db] analytics-no-perm: unsupported from(${String(table)})`);
          }
          if (isPermissionJoin) {
            return rbacMembershipFrom([] as RbacRow[]);
          }
          return {
            where(..._ignored: unknown[]) {
              return {
                limit(): Promise<RbacRow[]> {
                  return Promise.resolve([{ id: "m1" }]);
                },
              };
            },
          };
        },
      };
    },
  } as unknown as Db;
}

/**
 * Org membership probe fails for `assertOrgMember` (before permission checks).
 */
export function createAnalyticsNonMemberFakeDb(): Db {
  return {
    select(selection?: unknown) {
      const sel = selection as Record<string, unknown> | undefined;
      const isPermissionJoin =
        Boolean(sel && typeof sel === "object" && Object.keys(sel).includes("pk"));

      return {
        from(table: unknown) {
          if (table !== membership) {
            throw new Error(`[fake-db] analytics-non-member: unsupported from(${String(table)})`);
          }
          if (isPermissionJoin) {
            return rbacMembershipFrom([] as RbacRow[]);
          }
          return {
            where(..._ignored: unknown[]) {
              return {
                limit(): Promise<RbacRow[]> {
                  return Promise.resolve([]);
                },
              };
            },
          };
        },
      };
    },
  } as unknown as Db;
}
