import type { RuntimeCaching } from "serwist";
import { Strategy } from "serwist";

export class ShareTargetInterceptpr implements RuntimeCaching {
  method: RuntimeCaching["method"] = "POST";
  matcher: RuntimeCaching["matcher"] = "/api/sw/share";
  handler = new ShareTargetStrategy();
}

class ShareTargetStrategy extends Strategy {
  protected _handle: Strategy["_handle"] = (request, handler) => {
    return request
      .formData()
      .then((f) => f.get("shared_file"))
      .then((f) => {
        if (f instanceof File) {
          //   todo scan file
          return Response.redirect(`/review/${f.size}`, 303);
        }
        // todo - show an error
        return Response.redirect(`/scan`);
      });
  };
}
