import { env } from "@/lib/env";

export function getAppUrl(request?: Request) {
  const configuredUrl = env.APP_URL ?? env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) {
    return configuredUrl.trim().replace(/\/$/, "");
  }

  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    if (forwardedHost) {
      const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
      return `${forwardedProto}://${forwardedHost}`;
    }

    return new URL(request.url).origin;
  }

  return "http://localhost:3000";
}

export function getSafeNextPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/homes";
  }

  return next;
}
