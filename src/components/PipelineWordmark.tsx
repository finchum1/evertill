import type { CSSProperties } from "react";

interface PipelineWordmarkProps {
  themeEffective: "dark" | "light";
  iconSize?: number;
  fontSize?: number;
}

// The "P" mark (a flag/arrow bending into a house — the app's real brand
// asset, not a placeholder) next to the "Pipeline" text, replacing the
// plain text-only wordmark every nav surface used before. Two pre-tinted
// PNGs (public/icons/pipeline-mark-{navy,light}.png — background already
// keyed out, not colored via CSS) since the mark is a two-tone raster, not
// a single-color vector this app could recolor with currentColor the way
// its other hand-drawn icons do: navy reads fine on a light nav background
// but would nearly vanish against this app's dark theme, so
// themeEffective picks whichever variant actually has contrast.
export function PipelineWordmark({ themeEffective, iconSize = 22, fontSize = 15 }: PipelineWordmarkProps) {
  const src = themeEffective === "dark" ? "/icons/pipeline-mark-light.png" : "/icons/pipeline-mark-navy.png";
  return (
    <div style={wrapStyle}>
      <img src={src} alt="" width={iconSize} height={iconSize} style={{ display: "block", flexShrink: 0 }} />
      <span style={{ fontSize, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Pipeline</span>
    </div>
  );
}

const wrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};
