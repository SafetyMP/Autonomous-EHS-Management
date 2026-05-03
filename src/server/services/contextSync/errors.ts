export type ContextSyncErrorBody = {
  error: string;
  reason?: string;
  message?: string;
};

export class ContextSyncError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ContextSyncErrorBody,
  ) {
    super(body.message ?? body.error);
    this.name = "ContextSyncError";
  }
}
