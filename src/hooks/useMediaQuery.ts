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
