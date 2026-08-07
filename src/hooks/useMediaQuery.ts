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

// The one breakpoint this app needs: below it, the Sidebar/NotesSidebar
// switch from always-visible-in-the-flex-row to an off-canvas drawer (see
// TasksDashboard/NotesDashboard in App.tsx) since a fixed 240px sidebar
// plus content has no room to breathe under ~480px of remaining width.
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
