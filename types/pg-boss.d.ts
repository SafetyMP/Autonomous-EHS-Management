declare module "pg-boss" {
  import type { EventEmitter } from "events";

  export interface PgBossJob<T = object> {
    id: string;
    data: T;
  }

  export class PgBoss extends EventEmitter {
    constructor(value?: {
      connectionString?: string;
      schema?: string;
      [key: string]: unknown;
    });
    start(): Promise<PgBoss>;
    stop(options?: {
      close?: boolean;
      graceful?: boolean;
      timeout?: number;
      wait?: boolean;
    }): Promise<void>;
    send(
      name: string,
      data: object,
      options?: { singletonKey?: string },
    ): Promise<string | null>;
    work<T = object>(
      name: string,
      handler: (jobs: PgBossJob<T>[]) => Promise<void>,
    ): Promise<void>;
  }
}
