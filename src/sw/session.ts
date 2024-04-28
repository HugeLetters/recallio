import type { RuntimeCaching } from "serwist";
import { NetworkFirst } from "serwist";

export class SessionCache implements RuntimeCaching {
  matcher: RuntimeCaching["matcher"] = "/api/auth/session";
  handler = new NetworkFirst({ cacheName: "session" });
}
