import { useEffect, useState } from "react";

// The app has zero @media queries anywhere in its own components (it's
// entirely inline-style, so a stylesheet media query can't reach into a
// style={{}} object) — this is the JS-driven equivalent, matching how
// dark/light theme and accent color are already handled by JS state + CSS
// vars rather than pure CSS. Re-evaluates on resize/orientation change via
// the MediaQueryList's own change event, not a manual resize listener.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : false));

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    function handleChange(e: MediaQueryListEvent) {
      setMatches(e.matches);
    }
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

// The one breakpoint this app needs: below it, App.tsx swaps LeftNav's
// persistent sidebar for TopNav's slim bar + BottomTabBar (a sidebar has no
// real phone equivalent), and every modal/sheet becomes a MobileSheet
// bottom sheet instead of a centered dialog.
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

// Backs the app's translucent "glass" chrome (see lib/glass.ts) — a visitor
// who's asked their OS to reduce transparency gets a fully solid panel
// instead of a blurred, semi-opaque one. An @media query in a stylesheet
// can't override a same-property inline style regardless of specificity, so
// this can't be a plain CSS media query the way it would be on a normal
// site — every glass surface has to branch on this hook's value itself.
export function usePrefersReducedTransparency(): boolean {
  return useMediaQuery("(prefers-reduced-transparency: reduce)");
}
