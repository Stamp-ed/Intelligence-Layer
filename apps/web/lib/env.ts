/** Production API (Render) — override with NEXT_PUBLIC_API_URL if needed */
export const PRODUCTION_API_URL = "https://intelligence-layer.onrender.com";

export function getPublicApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_API_URL;
  }
  return "http://localhost:8000";
}
