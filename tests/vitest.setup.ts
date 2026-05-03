/**
 * Isolate Vitest from local developer secrets and optional Upstash endpoints so
 * `rateLimiter` stays null-backed and non-prod allow paths behave predictably.
 */
process.env.SKIP_ENV_VALIDATION ??= "1";
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
