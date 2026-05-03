import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

const PREFIX = "[Demo]";

/**
 * PostgreSQL LIKE treats `[` as a character-class opener; use ESCAPE for a literal `[Demo]` prefix.
 */
export function demoTitleStartsWith(column: AnyPgColumn): SQL {
  return sql`${column}::text LIKE '\\[Demo]%' ESCAPE '\\'`;
}

export function demoPrefixConstant(): string {
  return `${PREFIX} `;
}
