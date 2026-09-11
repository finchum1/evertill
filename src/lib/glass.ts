import type { CSSProperties } from "react";

// Apple's "Liquid Glass" material, approximated for the web. The first pass
// at this (a flat translucent tint + a single 1px inset highlight) read as
// "a bit blurry," not "glass" — real Liquid Glass is brighter than what's
// behind it (light gathering through the material, not just dimming it),
// has a diagonal specular sheen rather than a flat highlight line, and
// floating surfaces (a tab bar, a sheet) sit visibly *above* content with
// real elevation, not flush against it. Four ingredients now:
//   - backgroundColor: a translucent tint of the panel color, so it still
//     tracks the current theme/accent instead of a fixed hex
//   - backgroundImage: a diagonal white sheen, bright at one corner and
//     fading out — an actual highlight sweep, not a flat line
//   - backdrop-filter blur + saturate + brightness: brightness is what
//     makes the blurred backdrop read as "light passing through glass"
//     instead of "a dark smear," on top of the usual blur/saturate
//   - boxShadow: an inset top-lit / bottom-shadowed bevel (the material has
//     visible thickness, like a real pane of glass) plus, when `elevated`,
//     an outer drop shadow so a floating surface (BottomTabBar's pill,
//     MobileSheet's dialog/sheet) visibly sits above the content behind it
//     — non-floating chrome that's flush against the page edge (LeftNav,
//     TopNav) skips the elevation shadow, since there's no "above" for a
//     flush edge panel to float over.
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

  const bevel = "inset 0 1px 0 rgba(255, 255, 255, 0.18), inset 0 -1px 0 rgba(0, 0, 0, 0.12)";
  return {
    backgroundColor: "color-mix(in srgb, var(--bg-panel) 72%, transparent)",
    backgroundImage: "linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0) 45%, rgba(255, 255, 255, 0.06) 100%)",
    backdropFilter: "blur(28px) saturate(190%) brightness(1.15)",
    WebkitBackdropFilter: "blur(28px) saturate(190%) brightness(1.15)",
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
    backgroundImage: "linear-gradient(135deg, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0) 55%, rgba(255, 255, 255, 0.08) 100%)",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.15), 0 8px 20px -8px rgba(var(--shadow-color), 0.55)",
  };
}
