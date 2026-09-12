// A "Get Directions" action — maps.apple.com is a universal link: it opens
// the native Apple Maps app on iOS/macOS if installed, and falls back to
// Apple's own web Maps everywhere else, so this is a plain <a href> like
// every other contact action in this app (lib/contactLinks.ts) — no
// platform detection needed.
export function appleMapsHref(address: string): string {
  return `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`;
}
