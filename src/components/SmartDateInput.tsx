import { useState } from "react";
import type { CSSProperties, InputHTMLAttributes, UIEvent } from "react";
import { matchSmartDuePhrase } from "../lib/smartDate";

interface SmartDateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "style" | "placeholder"> {
  style?: CSSProperties;
  placeholder?: string;
}

// A plain <input> that highlights the phrase parseSmartDueDate would strip
// out ("tomorrow", "next Thursday"...) live as the user types, so the smart
// date parsing isn't a silent surprise on submit. A native <input> can't
// style part of its own text, so this layers a matching backdrop <div>
// (with the highlight span) behind a transparent-text input on top — the
// input keeps native focus/caret/selection/typing, the backdrop supplies
// the visible, styled text. The backdrop's inner text layer tracks the
// input's own scrollLeft so long text that auto-scrolls past the visible
// width stays aligned instead of drifting out of sync with the real caret.
export function SmartDateInput({ value, style, placeholder, onScroll, ...rest }: SmartDateInputProps) {
  const [scrollLeft, setScrollLeft] = useState(0);
  const text = typeof value === "string" ? value : "";
  const match = matchSmartDuePhrase(text);
  const baseColor = (style?.color as string) ?? "#f1f5f9";

  return (
    <div style={{ position: "relative", flex: style?.flex, minWidth: 0 }}>
      <div
        aria-hidden
        style={{
          ...style,
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: "100%",
            transform: `translateX(-${scrollLeft}px)`,
            color: baseColor,
            whiteSpace: "pre",
          }}
        >
          {text ? (
            match ? (
              <>
                {text.slice(0, match.start)}
                <span style={{ background: "#4338ca", color: "#fff", borderRadius: 3 }}>{text.slice(match.start, match.end)}</span>
                {text.slice(match.end)}
              </>
            ) : (
              text
            )
          ) : (
            <span style={{ color: "#64748b" }}>{placeholder}</span>
          )}
        </div>
      </div>
      <input
        value={value}
        aria-label={placeholder}
        onScroll={(e: UIEvent<HTMLInputElement>) => {
          setScrollLeft(e.currentTarget.scrollLeft);
          onScroll?.(e);
        }}
        {...rest}
        style={{
          ...style,
          position: "relative",
          background: "transparent",
          border: "1px solid transparent",
          color: "transparent",
          caretColor: baseColor,
        }}
      />
    </div>
  );
}
