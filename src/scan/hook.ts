import { browser } from "@/browser";
import { QueryErrorHandler } from "@/error/query";
import { logToastError, toast } from "@/interface/toast";
import { asyncStateOptions } from "@/state/async";
import { useStableValue } from "@/state/stable";
import { clamp, isDev } from "@/utils";
import { filterOut } from "@/utils/array/filter";
import { hasTruthyProperty } from "@/utils/object";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createBarcodeScanner } from "./scanner";

type UseBarcodeScannerOptions = {
  onScan: (result: string | null) => void;
};
export function useBarcodeScanner({ onScan }: UseBarcodeScannerOptions) {
  const [scanner] = useState(() => (browser ? createBarcodeScanner() : null));
  const onScanStable = useStableValue(onScan);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [changeZoom, setChangeZoom] = useState<ZoomHandler>(null);

  const client = useQueryClient();

  const { data: stream = null } = useQuery({
    ...asyncStateOptions({
      client,
      domain: "mediaDevices",
      dependencies: undefined,
      async queryFn() {
        if (!browser) {
          return null;
        }

        const devices = await getVideoDevices();
        return navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            deviceId: { ideal: devices.at(-1)?.deviceId },
          },
          audio: false,
        });
      },
    }),
    meta: {
      error: new QueryErrorHandler(() => {
        toast.error(
          "Coludn't start the scanner.\nMake sure camera access is granted and reload the page.",
          { id: "scanner start error" },
        );
      }),
    },
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !scanner || !stream) {
      return;
    }

    video.srcObject = stream;
    setChangeZoom(() => createZoomHandler(video));
    if (video.paused) {
      video.play().catch(console.error);
    }

    const cancelLoop = timedLoop(() => {
      return scanner
        .scanVideo(video)
        .then(onScanStable.current)
        .catch(
          logToastError("Unexpected error occured during scan", {
            id: "scanner unexpected error",
          }),
        );
    }, 500);

    return () => {
      video.srcObject = null;
      cancelLoop();
    };
  }, [scanner, stream, onScanStable]);

  return {
    /** Attach this ref to an {@link HTMLVideoElement} */
    ref: videoRef,
    scanner,
    changeZoom,
  };
}

/**
 * @returns cancel function
 */
function timedLoop(task: () => Promise<unknown>, period: number) {
  const loop = function () {
    const start = performance.now();
    task().finally(() => {
      const untilNextLoop = Math.max(0, period + start - performance.now());
      if (isDev && untilNextLoop === 0) {
        console.warn(`Task took longer than ${period}ms`);
      }
      timeout = window.setTimeout(loop, untilNextLoop);
    });
  };

  let timeout = window.setTimeout(loop, period);
  return () => {
    clearTimeout(timeout);
  };
}

type CameraConstraints = MediaTrackConstraints & { zoom?: number };
type ZoomHandler = ReturnType<typeof createZoomHandler>;
function createZoomHandler(video: HTMLVideoElement) {
  const stream = video.srcObject;
  if (!(stream instanceof MediaStream)) {
    return null;
  }

  const tracks = stream.getTracks();
  const canZoom = tracks.some((track) => !!getTrackZoomCapability(track));
  if (!canZoom) {
    return null;
  }

  return (zoom: number) => {
    const tracks = stream.getTracks();
    for (const track of tracks) {
      const zoomCapability = getTrackZoomCapability(track);
      if (!zoomCapability) {
        continue;
      }

      const { min, max } = zoomCapability;
      const normalizedZoom = clamp(min, min + (zoom / 100) * (max - min), max);
      const newConstraints: CameraConstraints = { zoom: normalizedZoom };
      track
        .applyConstraints(newConstraints)
        .catch(logToastError("Couldn't change zoom", { id: "scanner zoom change error" }));
    }
  };
}

type ZoomCapability = { min: number; max: number };
function getTrackZoomCapability(track: MediaStreamTrack) {
  if (!hasTruthyProperty(track, "getCapabilities")) {
    return null;
  }

  const { zoom } = track.getCapabilities() as { zoom?: ZoomCapability };
  if (!zoom) {
    return null;
  }

  const { min, max } = zoom;
  if (max <= min) {
    return null;
  }

  return zoom;
}

async function getVideoDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();

  return filterOut(devices, (device, bad) => {
    if (device.kind === "videoinput") {
      return device as InputDeviceInfo;
    }

    return bad;
  });
}
