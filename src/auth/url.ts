export function getSignInPath(url: string) {
  return `/auth/signin?callbackUrl=${encodeURIComponent(url)}`;
}
