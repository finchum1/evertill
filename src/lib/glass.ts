import type { CSSProperties } from "react";

// Apple's "Liquid Glass" material, approximated for the web. Round three of
// tuning this: a diagonal sheen (a linear-gradient highlight sweeping one
// corner to the other) read as a "mirror finish" rather than glass — a
// visible streak, not a material. Dropped entirely. What actually reads as
// "polished glass" instead is a bevel running around ALL FOUR edges (like
// real cut glass, or a glossy app icon) rather than just a lit top edge —
// done here with two diagonal inset shadows (one from the top-left corner,
// one from the bottom-right) rather than the single top-only highlight
// used before, so every side of the surface picks up a hint of light or
// shadow, not only the top. Three ingredients now:
//   - backgroundColor: a translucent tint of the panel color, so it still
//     tracks the current theme/accent instead of a fixed hex
//   - backdrop-filter blur + saturate + brightness: a light brightness
//     lift is what keeps a blurred backdrop reading as "glass" rather than
//     "a dark smear" — restored closer to a real polish now that the
//     diagonal sheen (the actual source of the old "mirror" look) is gone
//   - boxShadow: the all-sides bevel above, plus, when `elevated`, an
//     outer drop shadow so a floating surface (BottomTabBar's pill,
//     MobileSheet's dialog/sheet) visibly sits above the content behind it
//     — non-floating chrome flush against the page edge (LeftNav, TopNav)
//     skips the elevation shadow, since there's no "above" for a flush
//     edge panel to float over.
// Callers spread the result into their existing style object rather than
// using a CSS class, matching this codebase's inline-style-only convention
// (see useMediaQuery.ts's own comment on why - a stylesheet media query
// can't reach into a style={{}} prop).
export function glassStyle(reduceTransparency: boolean, elevated = false): CSSProperties {
  if (reduceTransparency) {
    // No blur, no tint - a plain solid panel, exactly what every one of
    // these surfaces rendered before this feature existed. Still elevated
    // (a real shadow, not a glass one) so a floating surface doesn't lose
    // its sense of depth entirely.
    return {
      background: "var(--bg-panel)",
      boxShadow: elevated ? "0 8px 30px -8px rgba(var(--shadow-color), 0.45)" : undefined,
    };
  }

  const bevel = "inset 1px 1px 0 rgba(255, 255, 255, 0.14), inset -1px -1px 0 rgba(0, 0, 0, 0.14)";
  return {
    backgroundColor: "color-mix(in srgb, var(--bg-panel) 76%, transparent)",
    backdropFilter: "blur(26px) saturate(160%) brightness(1.08)",
    WebkitBackdropFilter: "blur(26px) saturate(160%) brightness(1.08)",
    boxShadow: elevated ? `${bevel}, 0 12px 34px -10px rgba(var(--shadow-color), 0.55)` : bevel,
  };
}

// A "chip" that rests ON TOP of a glass surface (LeftNav's account row and
// ThemeToggleButton both sit inside/near an already-blurred glass panel)
// without blurring anything itself — a second backdrop-filter layered
// directly on an already-blurred one doubles the compositing cost for no
// visible gain, and easily looks murky rather than crisp. This is what a
// solid control resting on top of glass actually looks like: a lifted,
// subtly tinted capsule with the same all-sides bevel as glassStyle, not
// another pane of glass. Uses --border-strong (not a fixed white wash) so
// the tint stays visible against the panel in light theme too, where a
// white-on-white wash would all but disappear.
export function glassChipStyle(active: boolean): CSSProperties {
  return {
    background: active ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "color-mix(in srgb, var(--border-strong) 35%, transparent)",
    boxShadow: "inset 1px 1px 0 rgba(255, 255, 255, 0.14), inset -1px -1px 0 rgba(0, 0, 0, 0.1)",
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
    background: "color-mix(in srgb, var(--bg-panel) 60%, transparent)",
    boxShadow: "inset 1px 1px 0 rgba(255, 255, 255, 0.22), inset -1px -1px 0 rgba(0, 0, 0, 0.14), 0 4px 14px -4px rgba(var(--shadow-color), 0.4)",
  };
}

// A primary-action "glass button" — "+ Add Column," "+ New Transaction,"
// and the like. Real Liquid Glass buttons aren't fully see-through even
// when colored (that would tank contrast for their label text); they keep
// a solid, legible fill and get the glass identity from the same all-sides
// bevel + elevation the rest of this file uses, layered on top of the
// solid color instead of replacing it. No backdrop-filter here — a small
// button has essentially nothing worth blurring behind it, and skipping it
// avoids yet another compositing layer for no visible gain.
export function glassButtonStyle(): CSSProperties {
  return {
    backgroundColor: "var(--accent-strong)",
    boxShadow: "inset 1px 1px 0 rgba(255, 255, 255, 0.3), inset -1px -1px 0 rgba(0, 0, 0, 0.18), 0 8px 20px -8px rgba(var(--shadow-color), 0.55)",
  };
}
