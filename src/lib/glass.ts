import type { CSSProperties } from "react";

// Apple's "Liquid Glass" material, approximated for the web. Round two of
// tuning this: the previous version's strong diagonal sheen + brightness
// boost + bright bevel, spread across a LARGE surface (a modal panel
// covering most of the screen) in dark theme, read as a glossy "mirror
// finish" rather than soft frosted glass — a look that can work on a small
// button or pill (a glint reads intentional there) reads artificial at
// that scale. Toned down across the board: a much softer sheen, a gentler
// brightness lift, and a subtler bevel — still translucent/blurred/
// saturated (the actual "glass" identity), just frosted rather than
// polished. Four ingredients:
//   - backgroundColor: a translucent tint of the panel color, so it still
//     tracks the current theme/accent instead of a fixed hex
//   - backgroundImage: a faint diagonal sheen — present, but a hint rather
//     than a visible highlight sweep
//   - backdrop-filter blur + saturate + brightness: a light brightness
//     lift is still what keeps this reading as "glass" rather than "a dark
//     smear," just dialed back from a mirror-like boost
//   - boxShadow: a subtle inset top-lit / bottom-shadowed bevel (the
//     material still has a little visible thickness) plus, when
//     `elevated`, an outer drop shadow so a floating surface (BottomTabBar's
//     pill, MobileSheet's dialog/sheet) visibly sits above the content
//     behind it — non-floating chrome flush against the page edge
//     (LeftNav, TopNav) skips the elevation shadow, since there's no
//     "above" for a flush edge panel to float over.
// Callers spread the result into their existing style object rather than
// using a CSS class, matching this codebase's inline-style-only convention
// (see useMediaQuery.ts's own comment on why - a stylesheet media query
// can't reach into a style={{}} prop).
export function glassStyle(reduceTransparency: boolean, elevated = false): CSSProperties {
  if (reduceTransparency) {
    // No blur, no sheen, no tint - a plain solid panel, exactly what every
    // one of these surfaces rendered before this feature existed. Still
    // elevated (a real shadow, not a glass one) so a floating surface
    // doesn't lose its sense of depth entirely.
    return {
      background: "var(--bg-panel)",
      boxShadow: elevated ? "0 8px 30px -8px rgba(var(--shadow-color), 0.45)" : undefined,
    };
  }

  const bevel = "inset 0 1px 0 rgba(255, 255, 255, 0.09), inset 0 -1px 0 rgba(0, 0, 0, 0.1)";
  return {
    backgroundColor: "color-mix(in srgb, var(--bg-panel) 80%, transparent)",
    backgroundImage: "linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.02) 100%)",
    backdropFilter: "blur(26px) saturate(140%) brightness(1.04)",
    WebkitBackdropFilter: "blur(26px) saturate(140%) brightness(1.04)",
    boxShadow: elevated ? `${bevel}, 0 12px 34px -10px rgba(var(--shadow-color), 0.55)` : bevel,
  };
}

// A "chip" that rests ON TOP of a glass surface (LeftNav's account row and
// ThemeToggleButton both sit inside/near an already-blurred glass panel)
// without blurring anything itself — a second backdrop-filter layered
// directly on an already-blurred one doubles the compositing cost for no
// visible gain, and easily looks murky rather than crisp. This is what a
// solid control resting on top of glass actually looks like: a lifted,
// subtly tinted capsule with a small top highlight, not another pane of
// glass. Uses --border-strong (not a fixed white wash) so the tint stays
// visible against the panel in light theme too, where a white-on-white
// wash would all but disappear.
export function glassChipStyle(active: boolean): CSSProperties {
  return {
    background: active ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "color-mix(in srgb, var(--border-strong) 35%, transparent)",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.14)",
  };
}

// The "selected" indicator for a segmented control or nav row that already
// sits on top of a glass surface (ViewTabs' track, LeftNav's own panel) —
// a clear, lifted glass bubble with the accent color carried by its LABEL
// text, not a solid accent-colored fill. Lighter/more opaque than the
// track behind it so it still visibly separates as its own bubble, but
// still translucent — "glass," not "a colored rectangle." No backdrop-
// filter of its own for the same reason glassChipStyle skips one: it's
// already resting on an already-blurred surface, so a second blur layer
// here would just double the compositing cost for no visible gain.
export function glassBubbleStyle(reduceTransparency: boolean): CSSProperties {
  if (reduceTransparency) {
    return { background: "var(--bg-panel)" };
  }
  return {
    background: "color-mix(in srgb, var(--bg-panel) 62%, transparent)",
    backgroundImage: "linear-gradient(135deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0) 55%, rgba(255, 255, 255, 0.04) 100%)",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.18), inset 0 -1px 0 rgba(0, 0, 0, 0.08), 0 4px 14px -4px rgba(var(--shadow-color), 0.4)",
  };
}

// A primary-action "glass button" — "+ Add Column," "+ New Transaction,"
// and the like. Real Liquid Glass buttons aren't fully see-through even
// when colored (that would tank contrast for their label text); they keep
// a solid, legible fill and get the glass identity from the same diagonal
// sheen + bevel + elevation the rest of this file uses, layered on top of
// the solid color instead of replacing it. No backdrop-filter here — a
// small button has essentially nothing worth blurring behind it, and
// skipping it avoids yet another compositing layer for no visible gain.
export function glassButtonStyle(): CSSProperties {
  return {
    backgroundColor: "var(--accent-strong)",
    backgroundImage: "linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 55%, rgba(255, 255, 255, 0.05) 100%)",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.12), 0 8px 20px -8px rgba(var(--shadow-color), 0.55)",
  };
}
