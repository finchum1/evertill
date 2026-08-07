import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { LIST_COLOR_HEX } from "../types";

// The public, logged-out landing page. Shown below the app's own Header
// (which already renders the "Evertill" wordmark + Log in/Sign up), so
// this component only owns the marketing content itself.
//
// Each module section below is illustrated with a small hand-built preview
// panel (not a captured screenshot) that reuses this app's real tokens and
// component conventions (checkbox style, list-color dots, status pills, tag
// colors) so it reads as a faithful recreation of the actual UI — crisp at
// any resolution, and automatically correct in both light and dark theme.
// The data inside every preview is entirely fictional.

interface LandingProps {
  onGetStarted: () => void;
}

// The app's own component font stack — kept separate so the module preview
// mockups still render with the real product's actual typography, even
// though the surrounding marketing copy uses its own distinct voice below.
const APP_FONT_STACK = "'Inter', 'SF Pro Display', -apple-system, sans-serif";
// Loaded via <link> in index.html, scoped to this page only (see comment
// there) — a real webfont the rest of the app doesn't load, chosen for
// being the top SaaS/productivity-tool match from the ui-ux-pro-max design
// database rather than the app's previous unloaded "Inter" fallback stack.
const MARKETING_FONT_STACK = `'Plus Jakarta Sans', ${APP_FONT_STACK}`;

// One shared, harmonized accent per module instead of five unrelated
// saturated hues (the original indigo/sky/purple/amber/pink set read as an
// arbitrary rainbow). Tasks deliberately points at the app's own live accent
// token rather than a fixed hex — it's the one module every visitor has in
// common (see the hero copy), so tying it to whatever accent color a
// returning visitor already has selected reads as more "this is the real
// product" than a hardcoded indigo that might not match their theme at all.
// The other four stay fixed, deeper-toned hexes (Tailwind 600/700-ish, kept
// under ~80% saturation) so they still read as distinct categories without
// screaming.
const MODULE_COLOR = {
  tasks: "var(--accent-strong)",
  leads: "#0284c7",
  pipeline: "#7c3aed",
  deals: "#b45309",
  notes: "#be185d",
} as const;

// One-shot scroll-in reveal: fades/slides content up the first time it
// enters the viewport, then stops observing — re-triggering on every scroll
// up/down would feel gimmicky rather than premium. Skips the animation
// outright under prefers-reduced-motion by starting (and staying) in the
// resting visible state, rather than relying on the CSS transition duration
// alone — a reduced-motion visitor never even briefly sees the offset state.
function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      className={`landing-reveal${visible ? " landing-reveal-visible" : ""}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export function Landing({ onGetStarted }: LandingProps) {
  return (
    <main style={{ fontFamily: MARKETING_FONT_STACK, color: "var(--text-primary)" }}>
      <Hero onGetStarted={onGetStarted} />

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
        <ModuleSection
          eyebrow="Tasks"
          badgeColor={MODULE_COLOR.tasks}
          icon={<TasksIcon />}
          title="Every to-do, in the right place at the right time"
          description="Folders, lists, Today, Upcoming, and a full Month/Week/Day calendar — with drag-and-drop between all of them."
          bullets={[
            "Recurring tasks roll forward automatically when checked off",
            "Type “next Friday” or “tomorrow” in the title — it's parsed into a real due date",
            "Subtasks, descriptions, and quick-add from anywhere in the app",
          ]}
          preview={<TasksPreview />}
          reverse={false}
        />
        <ModuleSection
          eyebrow="Leads"
          badgeColor={MODULE_COLOR.leads}
          icon={<LeadsIcon />}
          title="A board built for working new business"
          description="Custom stages, tags, and a notes log on every card — with a next-activity picker that pops up the moment you log a touch."
          bullets={[
            "Drag cards between stages on the board",
            "Board, List, Calendar, and Value views of the same pipeline",
            "Never lose track of who to call next",
          ]}
          preview={<LeadsPreview />}
          reverse
        />
        <ModuleSection
          eyebrow="Pipeline"
          badgeColor={MODULE_COLOR.pipeline}
          icon={<PipelineIcon />}
          title="Long-term nurture, without the spreadsheet"
          description="For clients who aren't ready yet — 1+ Year down to Active — with the same board, notes, and next-activity workflow as Leads."
          bullets={[
            "Custom stages that match how you think about timing",
            "Move a client to Active the moment they're ready",
            "One click converts a busted Deal into Pipeline",
          ]}
          preview={<PipelinePreview />}
          reverse={false}
        />
        <ModuleSection
          eyebrow="Deals"
          badgeColor={MODULE_COLOR.deals}
          icon={<DealsIcon />}
          title="Every file, from acceptance to closing"
          description="A real transaction lifecycle — Active, In Escrow, Inspections, Pre-Closing, Closed — with a milestone timeline and a Tasks/Documents checklist from your own templates."
          bullets={[
            "Separate Buyer-side and Listing-side checklists",
            "A live stat dashboard across every open file",
            "Contact fields and notes history per deal",
          ]}
          preview={<DealsPreview />}
          reverse
        />
        <ModuleSection
          eyebrow="Notes"
          badgeColor={MODULE_COLOR.notes}
          icon={<NotesIcon />}
          title="Real formatting, not just plain text"
          description="Headings, bold, underline, and multicolor highlighting — organized into folders, with pinned notes at the top."
          bullets={[
            "A proper rich-text editor, not a bare textarea",
            "Pin the notes you reference constantly",
            "Folders keep unrelated notes from piling up",
          ]}
          preview={<NotesPreview />}
          reverse={false}
          last
        />
      </div>

      <Highlights />
      <FinalCta onGetStarted={onGetStarted} />
      <Footer />
    </main>
  );
}

function Hero({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        textAlign: "center",
        padding: "96px 24px 72px",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "-220px",
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 500,
          background: "radial-gradient(closest-side, var(--accent-subtle-bg), transparent 70%)",
          opacity: 0.6,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            display: "inline-block",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--accent)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: 18,
          }}
        >
          Evertill
        </div>
        <h1
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            lineHeight: 1.06,
            margin: "0 0 20px",
            textWrap: "balance",
          }}
        >
          Every task. Every follow-up.
          <br />
          One workspace.
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: 17,
            lineHeight: 1.6,
            margin: "0 auto 32px",
            maxWidth: 560,
            textWrap: "pretty",
          }}
        >
          Tasks and Notes for everyone, plus Leads, Pipeline, and Deals if you're tracking
          relationships and transactions too. Turn on only what fits.
        </p>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginBottom: 40 }}>
          <button onClick={onGetStarted} className="landing-btn-primary" style={primaryButtonStyle}>
            Create your workspace
          </button>
          <a href="#tasks" className="landing-link-cta" style={linkCtaStyle}>
            See what's inside
            <span className="landing-link-arrow" aria-hidden>
              <ArrowRightIcon />
            </span>
          </a>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {["Tasks", "Leads", "Pipeline", "Deals", "Notes"].map((m) => (
            <a key={m} href={`#${m.toLowerCase()}`} className="landing-pill" style={pillStyle}>
              {m}
            </a>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", maxWidth: 880, margin: "56px auto 0" }}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 32,
            left: -40,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "var(--accent)",
            opacity: 0.14,
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />
        <BrowserFrame>
          <TasksPreview large />
        </BrowserFrame>
      </div>
    </section>
  );
}

function ModuleSection({
  eyebrow,
  badgeColor,
  icon,
  title,
  description,
  bullets,
  preview,
  reverse,
  last,
}: {
  eyebrow: string;
  badgeColor: string;
  icon: ReactNode;
  title: string;
  description: string;
  bullets: string[];
  preview: ReactNode;
  reverse: boolean;
  last?: boolean;
}) {
  const text = (
    <div style={{ flex: "1 1 380px", minWidth: 320 }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: 11,
          // color-mix (not a hex+alpha-suffix string) so this works whether
          // badgeColor is a plain hex value or a CSS var() reference (the
          // Tasks module points its badge at var(--accent-strong) so it
          // always matches whatever accent the visitor already has active).
          background: `color-mix(in srgb, ${badgeColor} 14%, transparent)`,
          color: badgeColor,
          marginBottom: 18,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: badgeColor, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
        {eyebrow}
      </div>
      <h2
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
          margin: "0 0 14px",
          lineHeight: 1.2,
          textWrap: "balance",
        }}
      >
        {title}
      </h2>
      <p style={{ fontSize: 15.5, color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 20px" }}>{description}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {bullets.map((b) => (
          <div key={b} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ flexShrink: 0, marginTop: 5, width: 6, height: 6, borderRadius: 99, background: badgeColor }} />
            <span style={{ fontSize: 14.5, color: "var(--text-body)", lineHeight: 1.55 }}>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const previewCol = (
    <div style={{ flex: "1 1 460px", minWidth: 320 }}>
      <div className="landing-preview" style={previewFrameStyle}>
        {preview}
      </div>
    </div>
  );

  return (
    <Reveal>
      <section
        id={eyebrow.toLowerCase()}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 56,
          flexWrap: "wrap",
          padding: "64px 0",
          borderBottom: last ? "none" : "1px solid var(--border)",
          scrollMarginTop: 80,
        }}
      >
        {reverse ? (
          <>
            {previewCol}
            {text}
          </>
        ) : (
          <>
            {text}
            {previewCol}
          </>
        )}
      </section>
    </Reveal>
  );
}

function Highlights() {
  const items = [
    { icon: <ThemeIcon />, title: "Dark, light, or system", body: "Plus four accent colors to match your style." },
    {
      icon: <ToggleIcon />,
      title: "Only the modules you use",
      body: "Keep all five for real estate, or turn off what you don't need — it disappears from nav and Create.",
    },
    { icon: <DragIcon />, title: "Drag-and-drop everywhere", body: "Tasks, leads, clients, calendar days — drag them wherever they go." },
    { icon: <LockIcon />, title: "Your own private workspace", body: "Self-service signup, your data scoped to your account alone." },
  ];
  return (
    <section style={{ background: "var(--bg-panel)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "64px 24px", display: "flex", gap: 32, flexWrap: "wrap" }}>
        {items.map((item, i) => (
          <Reveal key={item.title} delay={i * 80}>
            <div style={{ flex: "1 1 220px", minWidth: 200 }}>
              <div style={{ color: "var(--accent)", marginBottom: 14 }}>{item.icon}</div>
              <div style={{ fontSize: 15.5, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.55 }}>{item.body}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function FinalCta({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <Reveal>
      <section style={{ textAlign: "center", padding: "88px 24px" }}>
        <h2
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            margin: "0 0 14px",
            textWrap: "balance",
          }}
        >
          Stop juggling five tools for one file.
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 15.5, margin: "0 0 28px" }}>
          See it end to end in under a minute.
        </p>
        <button onClick={onGetStarted} className="landing-btn-primary" style={primaryButtonStyle}>
          Create your workspace
        </button>
      </section>
    </Reveal>
  );
}

function Footer() {
  const links = ["Tasks", "Leads", "Pipeline", "Deals", "Notes"];
  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: "28px 24px" }}>
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Evertill</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>One workspace, only the modules you need.</span>
        </div>
        <nav style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {links.map((l) => (
            <a key={l} href={`#${l.toLowerCase()}`} className="landing-link-cta" style={footerLinkStyle}>
              {l}
            </a>
          ))}
        </nav>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>© {new Date().getFullYear()} Evertill</span>
      </div>
    </footer>
  );
}

function BrowserFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="landing-preview-hero"
      style={{
        borderRadius: 16,
        border: "1px solid var(--border)",
        background: "var(--bg-panel)",
        overflow: "hidden",
        textAlign: "left",
        // Reset back to the app's own font — this frame previews the real
        // product UI, which shouldn't pick up the marketing copy's font.
        fontFamily: APP_FONT_STACK,
      }}
    >
      <div style={{ display: "flex", gap: 6, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ width: 10, height: 10, borderRadius: 99, background: "#ef4444" }} />
        <span style={{ width: 10, height: 10, borderRadius: 99, background: "#f59e0b" }} />
        <span style={{ width: 10, height: 10, borderRadius: 99, background: "#22c55e" }} />
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

// ---------- Module preview mockups ----------
// Fictional data only. Styled to match the real components (AnimatedCheckbox,
// list-color dots, tag pills, status pills) but simplified — these are not
// interactive and don't import the real hooks/components.

function TasksPreview({ large }: { large?: boolean }) {
  const rows: { title: string; done?: boolean; date?: string; overdue?: boolean; sub?: number; color: string; list: string }[] = [
    { title: "Submit Q3 invoice", date: "Wed, Jul 22", overdue: true, color: LIST_COLOR_HEX.blue, list: "Freelance" },
    { title: "Finish reading for Chem 101", sub: 2, color: LIST_COLOR_HEX.indigo, list: "School" },
    { title: "Send pitch deck to investors", done: true, color: LIST_COLOR_HEX.indigo, list: "Startup" },
    { title: "Confirm venue for launch event", date: "Fri, Aug 7", color: LIST_COLOR_HEX.teal, list: "Events" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: large ? 10 : 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>Today</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>+ Add task</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.title}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 12px",
            borderRadius: 9,
            border: "1px solid var(--border)",
            background: "var(--bg-panel)",
          }}
        >
          <span
            style={{
              width: 17,
              height: 17,
              borderRadius: 99,
              flexShrink: 0,
              border: `2px solid ${r.done ? "var(--accent)" : "var(--border-strong)"}`,
              background: r.done ? "var(--accent)" : "transparent",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {r.done && (
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5.2L4 7.7L8.5 2.3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: r.done ? "var(--text-muted)" : "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {r.title}
            </span>
            {(r.date || r.sub) && (
              <span style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-secondary)" }}>
                {r.date && <span style={{ color: r.overdue ? "var(--danger)" : "var(--text-secondary)", fontWeight: 600 }}>{r.date}</span>}
                {r.sub && <span>☑ {r.sub}</span>}
              </span>
            )}
          </div>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: r.color }} />
            {r.list}
          </span>
        </div>
      ))}
    </div>
  );
}

function KanbanPreview({
  columns,
}: {
  columns: { label: string; color: string; cards: { title: string; value?: string; tag?: { label: string; color: string } }[] }[];
}) {
  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
      {columns.map((col) => (
        <div key={col.label} style={{ flex: "1 1 140px", minWidth: 140, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: col.color }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-body)" }}>{col.label}</span>
          </div>
          {col.cards.map((c) => (
            <div
              key={c.title}
              style={{
                background: "var(--bg-panel)",
                border: "1px solid var(--border)",
                borderRadius: 9,
                padding: "9px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 5,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>{c.title}</span>
                {c.value && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)" }}>{c.value}</span>}
              </div>
              {c.tag && (
                <span
                  style={{
                    alignSelf: "flex-start",
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: c.tag.color,
                    background: `${c.tag.color}20`,
                    borderRadius: 5,
                    padding: "2px 6px",
                  }}
                >
                  {c.tag.label}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function LeadsPreview() {
  return (
    <KanbanPreview
      columns={[
        {
          label: "New Lead",
          color: LIST_COLOR_HEX.purple,
          cards: [{ title: "Morgan Hale", value: "$410,000", tag: { label: "Buyer", color: "#3b82f6" } }],
        },
        {
          label: "Contacted",
          color: LIST_COLOR_HEX.green,
          cards: [{ title: "Priya Shah", value: "$268,000", tag: { label: "Listing", color: "#a855f7" } }],
        },
        {
          label: "Qualified",
          color: LIST_COLOR_HEX.indigo,
          cards: [{ title: "Diego Fields", value: "$525,000", tag: { label: "Buyer", color: "#3b82f6" } }],
        },
      ]}
    />
  );
}

function PipelinePreview() {
  return (
    <KanbanPreview
      columns={[
        { label: "6+ Months", color: LIST_COLOR_HEX.teal, cards: [{ title: "Casey Nguyen", value: "$340,000" }] },
        { label: "1-3 Months", color: LIST_COLOR_HEX.amber, cards: [{ title: "Rowan Blake", value: "$455,000" }] },
        { label: "Active", color: LIST_COLOR_HEX.blue, cards: [{ title: "Jamie Ortiz", value: "$610,000" }] },
      ]}
    />
  );
}

function DealsPreview() {
  const stats = [
    { label: "Active", count: 3, color: "#3b82f6" },
    { label: "In Escrow", count: 2, color: "#6366f1" },
    { label: "Pre-Closing", count: 1, color: "#a855f7" },
  ];
  const rows = [
    { address: "482 Birchwood Ln", type: "BUYER SIDE", status: "In Escrow", color: "#6366f1", step: 2 },
    { address: "119 Harbor Ct", type: "LISTING SIDE", status: "Pre-Closing", color: "#a855f7", step: 3 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 9, padding: "8px 10px", background: "var(--bg-panel)" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 10.5, color: "var(--text-secondary)", fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.address} style={{ border: "1px solid var(--border)", borderRadius: 9, padding: "10px 12px", background: "var(--bg-panel)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em" }}>{r.type}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{r.address}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: r.color, background: `${r.color}20`, borderRadius: 99, padding: "3px 9px" }}>
              {r.status}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 99,
                  background: i <= r.step ? r.color : "var(--border-strong)",
                  flexShrink: 0,
                }}
              />
            ))}
            <span style={{ flex: 1, height: 2, background: "var(--border)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotesPreview() {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 9, padding: "12px 14px", background: "var(--bg-panel)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Client project brief</span>
          <PinIcon />
        </div>
        <div style={{ fontSize: 12, color: "var(--text-body)", lineHeight: 1.5 }}>
          Final deliverables{" "}
          <mark style={{ background: "#fde68a", color: "#78350f", borderRadius: 3, padding: "0 3px" }}>due by Friday</mark>{" "}
          — confirm scope before starting.
        </div>
      </div>
      <div style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 9, padding: "12px 14px", background: "var(--bg-panel)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>New hire checklist</div>
        <div style={{ fontSize: 12, color: "var(--text-body)", lineHeight: 1.5 }}>
          <strong>Week one:</strong> account setup, tool access, intro call with the team.
        </div>
        <span style={{ display: "inline-block", marginTop: 8, fontSize: 10, fontWeight: 600, color: "var(--text-muted)", border: "1px solid var(--border-strong)", borderRadius: 5, padding: "2px 7px" }}>
          Onboarding
        </span>
      </div>
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ color: "var(--accent)" }}>
      <path
        d="M8 1.5L9.5 5L13.5 6.5L10.5 9.5L11 14L8 11.5L5 14L5.5 9.5L2.5 6.5L6.5 5L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------- Small section icons (decorative, landing-page only) ----------

function TasksIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 10L8.5 12L13.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function LeadsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 4H17L12.5 10.5V16L7.5 14V10.5L3 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function PipelineIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 6H17M3 10H17M3 14H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17" cy="14" r="1.6" fill="currentColor" />
    </svg>
  );
}
function DealsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8.5H17" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 12H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function NotesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 3H15V17L10 14.5L5 17V3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function ThemeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 3V17A7 7 0 0 0 10 3Z" fill="currentColor" />
    </svg>
  );
}
function ToggleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="6" width="16" height="8" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="10" r="2.6" fill="currentColor" />
    </svg>
  );
}
function DragIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="10" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 7L14 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 2.2" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------- Shared styles ----------
// background/color/border are deliberately left OUT of primaryButtonStyle/
// pillStyle below wherever a .landing-* class in index.css changes that same
// property on :hover — a non-!important stylesheet rule can never override
// an inline style on the same property, pseudo-class or not, so the resting
// value for anything a hover state touches has to live in the CSS class
// itself instead (see the comments in index.css for the fuller explanation).

const primaryButtonStyle: CSSProperties = {
  border: "none",
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 15,
  padding: "13px 26px",
  cursor: "pointer",
};

const linkCtaStyle: CSSProperties = {
  fontWeight: 600,
  fontSize: 15,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
};

const footerLinkStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
};

const pillStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 99,
  padding: "5px 12px",
  textDecoration: "none",
  cursor: "pointer",
  display: "inline-block",
};

const previewFrameStyle: CSSProperties = {
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "var(--bg-panel)",
  padding: 20,
  // Same reasoning as BrowserFrame above: these preview the real product UI.
  fontFamily: APP_FONT_STACK,
};
