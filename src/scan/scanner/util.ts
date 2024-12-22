export function isVideoReady(video: HTMLVideoElement) {
  if (video.readyState < 2) {
    return false;
  }

  const { videoWidth, videoHeight } = video;
  return videoWidth * videoHeight !== 0;
}
