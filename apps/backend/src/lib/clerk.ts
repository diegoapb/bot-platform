import { createClerkClient } from "@clerk/backend";
import { env } from "../env.js";

/** Cliente Clerk compartido (verificación de tokens + Backend API: orgs, users). */
export const clerk = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
  publishableKey: env.CLERK_PUBLISHABLE_KEY,
});
