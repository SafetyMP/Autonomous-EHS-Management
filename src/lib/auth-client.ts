import { createAuthClient } from "better-auth/react";

const baseURL = process.env.NEXT_PUBLIC_APP_URL;

export const authClient = createAuthClient({
  baseURL: baseURL ?? "http://localhost:3000",
});
