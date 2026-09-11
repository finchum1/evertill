import type { CSSProperties } from "react";

// Apple's "Liquid Glass" translucent material, approximated for the web —
// used for the app's floating chrome (LeftNav, TopNav, BottomTabBar) and
// its modal/sheet surfaces (MobileSheet), the same set of surfaces Apple's
// own materials guidance reserves this treatment for (nav bars, toolbars,
// sheets — not ordinary content like list rows or cards, which stay a
// plain opaque panel so nothing stacks two translucent layers and blurs
// legibility). Three ingredients, all standard CSS:
//   - a semi-opaque tint of the panel color (not a fixed hex) so it still
//     tracks the current theme and accent
//   - backdrop-filter blur + saturate, so whatever scrolls underneath
//     shows through softly instead of being fully hidden
//   - a hairline inset highlight along the top edge - a plain blur reads
//     as "frosted," but that one extra highlight is what reads as an
//     actual physical sheet of glass catching light
// Callers spread the result into their existing style object rather than
// using a CSS class, matching this codebase's inline-style-only
// convention (see useMediaQuery.ts's own comment on why - a stylesheet
// media query can't reach into a style={{}} prop).
export function glassStyle(reduceTransparency: boolean): CSSProperties {
  if (reduceTransparency) {
    // No backdrop-filter, no boxShadow highlight - a plain solid panel,
    // exactly what every one of these surfaces rendered before this
    // feature existed.
    return { background: "var(--bg-panel)" };
  }
  return {
    background: "color-mix(in srgb, var(--bg-panel) 78%, transparent)",
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.07)",
  };
}
