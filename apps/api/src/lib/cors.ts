import { config } from "../config.js";

/** Vercel production aliases + preview deployments for project "intelligence-layer" */
const VERCEL_ORIGIN =
  /^https:\/\/intelligence-layer[\w-]*\.vercel\.app$/i;

export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }
  if (config.allowedOrigins.includes(origin)) {
    return true;
  }
  return VERCEL_ORIGIN.test(origin);
}

/** For cors middleware: reflect allowed origin string (required with credentials). */
export function resolveCorsOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean | string) => void,
): void {
  if (!origin) {
    callback(null, true);
    return;
  }
  if (isAllowedCorsOrigin(origin)) {
    callback(null, origin);
    return;
  }
  callback(null, false);
}
