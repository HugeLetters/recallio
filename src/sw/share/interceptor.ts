import type { RuntimeCaching } from "serwist";
import { Strategy } from "serwist";
import { updateShareTarget } from "./db";
import { SHARE_TARGET_ERROR_PARAM, SHARE_TARGET_PARAM } from "./url";

export class ShareTargetInterceptpr implements RuntimeCaching {
  method: RuntimeCaching["method"] = "POST";
  matcher: RuntimeCaching["matcher"] = "/api/sw/share";
  handler = new ShareTargetStrategy();
}

class ShareTargetStrategy extends Strategy {
  protected _handle: Strategy["_handle"] = (request) => {
    return request.formData().then((formData) => {
      const file = formData.get("shared_file");
      if (file instanceof File && file.size > 0) {
        return updateShareTarget(file)
          .then(() => redirectToScan(true))
          .catch((e) => {
            console.error(e);
            return redirectToScan(false);
          });
      }
      return redirectToScan(false);
    });
  };
}

function redirectToScan(success: boolean) {
  const url = `/scan?=${SHARE_TARGET_PARAM}${!success ? `&${SHARE_TARGET_ERROR_PARAM}` : ""}`;
  return Response.redirect(url);
}
