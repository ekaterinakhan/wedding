import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import menuI18n from "./i18n/en.json";

/* ──────────────────────────────────────────────
   CONSTANTS
   ────────────────────────────────────────────── */

const MENU_SECTIONS = menuI18n.menu.sections;
const COURSES = ["starter", "main", "dessert"];
const COURSE_LABEL = { starter: "Entrée", main: "Plat", dessert: "Dessert" };
const COURSE_LABEL_EN = { starter: "Starter", main: "Main", dessert: "Dessert" };
const WEDDING_DATE = new Date("2026-05-09T14:00:00+02:00");
const ROMAN = ["I", "II", "III", "IV", "V"];

const TABS = [
  { id: "overview", label: "Overview", subtitle: "Aperçu" },
  { id: "guests", label: "Families", subtitle: "Invités" },
  { id: "courses", label: "Courses", subtitle: "Service" },
  { id: "menu", label: "Tally", subtitle: "Cuisine" },
  { id: "transport", label: "Transport", subtitle: "Voiturage" },
];

const PALETTE = {
  ink: "#1a2520",
  sageDeep: "#2d4339",
  sage: "#4a6355",
  sageSoft: "rgba(45,67,57,0.10)",
  gold: "#a47c2e",
  goldSoft: "rgba(164,124,46,0.10)",
  goldLine: "rgba(164,124,46,0.32)",
  terracotta: "#b8543a",
  terraSoft: "rgba(184,84,58,0.10)",
  paper: "#fbf5e7",
  paperHi: "#fffbf0",
  edge: "rgba(45,67,57,0.14)",
  edgeStrong: "rgba(45,67,57,0.26)",
  mist: "#6d6655",
  mistSoft: "#8c8472",
};

/* ──────────────────────────────────────────────
   HELPERS
   ────────────────────────────────────────────── */

function isAttending(p) {
  return p.guest_type !== "primary" || p.attendance !== "no";
}

function daysUntilWedding() {
  const ms = WEDDING_DATE.getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

function groupFamilies(people) {
  const map = new Map();
  for (const p of people) {
    const key = p.rsvp_id ?? p.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }
  return [...map.values()].map((members) => {
    const primary = members.find((m) => m.guest_type === "primary") || members[0];
    const plusOne = members.find((m) => m.guest_type === "plus_one");
    const children = members.filter((m) => m.guest_type === "child");
    return { primary, plusOne, children, members, attending: isAttending(primary) };
  });
}

function courseFilledCount(person) {
  return COURSES.filter((c) => person?.[c]).length;
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

/* ──────────────────────────────────────────────
   ORNAMENTS
   ────────────────────────────────────────────── */

function Ornament({ size = 14, className = "" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <g fill="currentColor">
        <circle cx="12" cy="12" r="0.9" />
        <path d="M12 4 c0.6 4 0.6 4 4 4 c-4 0 -4 0 -4 4 c0 -4 0 -4 -4 -4 c4 0 4 0 4 -4 z" opacity="0.55" />
        <path d="M12 16 c0.6 4 0.6 4 4 4 c-4 0 -4 0 -4 -4 c0 4 0 4 -4 4 c4 0 4 0 4 -4 z" opacity="0.35" />
      </g>
    </svg>
  );
}

function HairlineRule({ tone = "edge", className = "" }) {
  const color = tone === "gold" ? PALETTE.goldLine : PALETTE.edge;
  return <div className={className} style={{ height: 1, background: color }} />;
}

/* ──────────────────────────────────────────────
   PRIMITIVES
   ────────────────────────────────────────────── */

function Surface({ children, className = "", elevated = false, style }) {
  return (
    <div
      className={`relative rounded-[14px] ${className}`}
      style={{
        background: elevated ? PALETTE.paperHi : "rgba(255,251,240,0.78)",
        border: `1px solid ${PALETTE.edge}`,
        boxShadow: elevated
          ? "0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 30px rgba(45,67,57,0.05)"
          : "0 1px 0 rgba(255,255,255,0.5) inset",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Kicker({ children, accent = "gold" }) {
  const color = accent === "gold" ? PALETTE.gold : PALETTE.sage;
  return (
    <span
      className="inline-flex items-center gap-2 text-[10px] font-medium uppercase"
      style={{ letterSpacing: "0.22em", color }}
    >
      <span className="inline-block h-px w-5" style={{ background: color, opacity: 0.5 }} />
      {children}
    </span>
  );
}

function SectionTitle({ kicker, title, sub }) {
  return (
    <header className="flex flex-col gap-2">
      {kicker && <Kicker>{kicker}</Kicker>}
      <h2
        className="font-serif leading-[0.95] tracking-[-0.005em]"
        style={{ color: PALETTE.ink, fontSize: "clamp(1.6rem, 2.6vw, 2.4rem)" }}
      >
        {title}
      </h2>
      {sub && (
        <p className="text-sm italic" style={{ color: PALETTE.mist, fontFamily: "Cormorant Garamond, serif" }}>
          {sub}
        </p>
      )}
    </header>
  );
}

function StatTile({ label, value, sub, tone = "default", index = 0 }) {
  const accentBar = {
    default: PALETTE.gold,
    success: "#56794d",
    warn: PALETTE.terracotta,
    info: PALETTE.sage,
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: index * 0.04 }}
    >
      <Surface elevated className="px-5 py-4 flex flex-col gap-2 h-full">
        <div className="flex items-center justify-between">
          <span
            className="text-[9.5px] font-semibold uppercase"
            style={{ letterSpacing: "0.2em", color: PALETTE.mist }}
          >
            {label}
          </span>
          <span style={{ width: 14, height: 1.5, background: accentBar, opacity: 0.7 }} />
        </div>
        <div
          className="font-serif tabular-nums leading-none"
          style={{ color: PALETTE.ink, fontSize: "2.3rem", fontFeatureSettings: "'lnum'" }}
        >
          {value}
        </div>
        {sub && (
          <span className="text-[11px] italic" style={{ color: PALETTE.mistSoft, fontFamily: "Cormorant Garamond, serif" }}>
            {sub}
          </span>
        )}
      </Surface>
    </motion.div>
  );
}

function Pill({ children, tone = "neutral", className = "" }) {
  const tones = {
    neutral: { bg: "rgba(255,251,240,0.9)", color: PALETTE.ink, border: PALETTE.edge },
    sage: { bg: "rgba(45,67,57,0.08)", color: PALETTE.sageDeep, border: "rgba(45,67,57,0.20)" },
    gold: { bg: PALETTE.goldSoft, color: PALETTE.gold, border: PALETTE.goldLine },
    success: { bg: "rgba(86,121,77,0.10)", color: "#3f5938", border: "rgba(86,121,77,0.28)" },
    warn: { bg: PALETTE.terraSoft, color: PALETTE.terracotta, border: "rgba(184,84,58,0.32)" },
    plus: { bg: "rgba(132,90,150,0.10)", color: "#69447a", border: "rgba(132,90,150,0.30)" },
    child: { bg: "rgba(196,160,110,0.12)", color: "#7a5d2c", border: "rgba(196,160,110,0.32)" },
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold uppercase ${className}`}
      style={{
        background: tones.bg,
        color: tones.color,
        border: `1px solid ${tones.border}`,
        letterSpacing: "0.14em",
      }}
    >
      {children}
    </span>
  );
}

function TypePill({ type }) {
  if (type === "primary") return <Pill tone="sage">Guest</Pill>;
  if (type === "plus_one") return <Pill tone="plus">+1</Pill>;
  if (type === "child") return <Pill tone="child">Child</Pill>;
  return <Pill>{type}</Pill>;
}

function CourseDots({ person }) {
  return (
    <span className="inline-flex items-center gap-1" title={COURSES.map((c) => `${COURSE_LABEL_EN[c]}: ${person?.[c] || "—"}`).join("  ·  ")}>
      {COURSES.map((c) => {
        const filled = Boolean(person?.[c]);
        return (
          <span
            key={c}
            aria-label={`${COURSE_LABEL_EN[c]} ${filled ? "selected" : "empty"}`}
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: filled ? PALETTE.sageDeep : "transparent",
              border: `1px solid ${filled ? PALETTE.sageDeep : PALETTE.terracotta}`,
            }}
          />
        );
      })}
    </span>
  );
}

/* ──────────────────────────────────────────────
   COURSE PICKER (used in Courses tab)
   ────────────────────────────────────────────── */

function CoursePicker({ value, course, onChange, disabled }) {
  const section = MENU_SECTIONS.find((s) => s.id === course);
  const options = section ? section.options : [];
  const empty = !value;

  return (
    <div className="relative">
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none cursor-pointer text-[13px] rounded-md pl-3 pr-7 py-2 outline-none transition focus:ring-2"
        style={{
          background: empty ? PALETTE.terraSoft : PALETTE.paperHi,
          color: empty ? PALETTE.terracotta : PALETTE.ink,
          border: `1px solid ${empty ? "rgba(184,84,58,0.32)" : PALETTE.edge}`,
          fontFamily: "Manrope, sans-serif",
          fontStyle: empty ? "italic" : "normal",
          fontWeight: 500,
        }}
      >
        <option value="">— pick {COURSE_LABEL_EN[course].toLowerCase()} —</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.label}>
            {opt.label}
            {opt.description ? ` · ${opt.description}` : ""}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: "4px solid transparent",
          borderRight: "4px solid transparent",
          borderTop: `5px solid ${empty ? PALETTE.terracotta : PALETTE.sage}`,
          opacity: 0.7,
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────
   MASTHEAD + NAV
   ────────────────────────────────────────────── */

function Masthead({ onLogout, peopleCount, attendingCount }) {
  const days = daysUntilWedding();
  const dayLabel =
    days < 0 ? "happily ever after" :
    days === 0 ? "today is the day" :
    days === 1 ? "1 day to go" :
    `${days} days to go`;

  return (
    <header className="relative">
      <div
        style={{
          background: `linear-gradient(180deg, ${PALETTE.paper} 0%, rgba(251,245,231,0.85) 100%)`,
          borderBottom: `1px solid ${PALETTE.edge}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-8 pb-6">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase" style={{ letterSpacing: "0.32em", color: PALETTE.gold }}>
                <Ornament size={11} />
                The Wedding Atelier
                <Ornament size={11} />
              </span>
              <h1
                className="font-serif leading-[0.92]"
                style={{ color: PALETTE.ink, fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.005em" }}
              >
                Ekaterina <span style={{ color: PALETTE.gold, fontStyle: "italic", fontWeight: 500 }}>&</span> Lucas
              </h1>
              <div className="flex items-center gap-3 text-[12px]" style={{ color: PALETTE.mist }}>
                <span className="italic" style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 16 }}>
                  9 — 10 May 2026 · Burgundy
                </span>
                <span style={{ width: 4, height: 4, borderRadius: 999, background: PALETTE.gold, opacity: 0.6 }} />
                <span className="font-medium uppercase" style={{ letterSpacing: "0.18em", fontSize: 10 }}>
                  {dayLabel}
                </span>
              </div>
            </div>

            <div className="flex items-end gap-6">
              {peopleCount != null && (
                <div className="flex flex-col items-end">
                  <span className="text-[9.5px] font-semibold uppercase" style={{ letterSpacing: "0.22em", color: PALETTE.mist }}>
                    on the books
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="font-serif tabular-nums" style={{ fontSize: "1.6rem", color: PALETTE.ink, lineHeight: 1 }}>
                      {attendingCount}
                    </span>
                    <span className="text-[12px] italic" style={{ color: PALETTE.mistSoft, fontFamily: "Cormorant Garamond, serif" }}>
                      of {peopleCount}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col items-end gap-2">
                <a
                  href="/"
                  className="text-[11px] font-semibold uppercase transition hover:opacity-100"
                  style={{ letterSpacing: "0.22em", color: PALETTE.mist, opacity: 0.75 }}
                >
                  ← To the site
                </a>
                <button
                  onClick={onLogout}
                  className="text-[11px] font-semibold uppercase transition"
                  style={{ letterSpacing: "0.22em", color: PALETTE.terracotta }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>

        <HairlineRule tone="gold" />
      </div>
    </header>
  );
}

function Nav({ tab, onChange }) {
  return (
    <nav className="max-w-7xl mx-auto px-5 sm:px-8 pt-5 pb-2">
      <ul className="flex flex-wrap gap-1 sm:gap-3 -mx-1">
        {TABS.map((t, i) => {
          const active = t.id === tab;
          return (
            <li key={t.id}>
              <button
                onClick={() => onChange(t.id)}
                className="relative px-3 sm:px-4 py-2 text-left transition"
                style={{ color: active ? PALETTE.ink : PALETTE.mist }}
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-serif italic tabular-nums"
                    style={{
                      color: active ? PALETTE.gold : "rgba(164,124,46,0.5)",
                      fontSize: 13,
                      fontWeight: 500,
                      transform: "translateY(-2px)",
                    }}
                  >
                    {ROMAN[i]}.
                  </span>
                  <span
                    className="font-serif"
                    style={{
                      fontSize: 22,
                      fontStyle: active ? "italic" : "normal",
                      fontWeight: active ? 600 : 500,
                      letterSpacing: active ? 0 : "-0.005em",
                    }}
                  >
                    {t.label}
                  </span>
                  <span
                    className="hidden sm:inline text-[10px] font-medium uppercase"
                    style={{ letterSpacing: "0.18em", color: PALETTE.mistSoft, opacity: 0.7 }}
                  >
                    {t.subtitle}
                  </span>
                </div>
                {active && (
                  <motion.div
                    layoutId="navrule"
                    className="absolute left-2 right-2 -bottom-px"
                    style={{ height: 2, background: PALETTE.ink }}
                    transition={{ type: "spring", damping: 28, stiffness: 380 }}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <HairlineRule />
    </nav>
  );
}

/* ──────────────────────────────────────────────
   LOGIN
   ────────────────────────────────────────────── */

function LoginForm({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/private/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (res.ok) onLogin();
      else setError(json.error || "Invalid password.");
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: `radial-gradient(circle at 30% 20%, rgba(164,124,46,0.10), transparent 60%), linear-gradient(180deg, ${PALETTE.paper}, #f6efde)`,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[380px]"
      >
        <div className="text-center mb-7 flex flex-col items-center gap-3">
          <Ornament size={20} className="text-[color:var(--color-sage-700)]" />
          <span
            className="text-[10px] font-semibold uppercase"
            style={{ letterSpacing: "0.32em", color: PALETTE.gold }}
          >
            The Wedding Atelier
          </span>
          <h1
            className="font-serif leading-none"
            style={{ color: PALETTE.ink, fontSize: "clamp(2.2rem, 5vw, 3rem)" }}
          >
            <span style={{ fontStyle: "italic", fontWeight: 500 }}>Intendance</span>
          </h1>
          <p
            className="italic"
            style={{ fontFamily: "Cormorant Garamond, serif", color: PALETTE.mist, fontSize: 16 }}
          >
            Members only · Ekaterina &amp; Lucas
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: PALETTE.paperHi,
            border: `1px solid ${PALETTE.edge}`,
            boxShadow: "0 24px 60px rgba(45,67,57,0.10), 0 1px 0 rgba(255,255,255,0.6) inset",
          }}
          className="rounded-[14px] p-7 flex flex-col gap-4"
        >
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold uppercase" style={{ letterSpacing: "0.22em", color: PALETTE.mist }}>
              Passphrase
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              className="w-full px-4 py-3 outline-none transition"
              style={{
                background: PALETTE.paper,
                border: `1px solid ${PALETTE.edge}`,
                borderRadius: 10,
                fontFamily: "Manrope, sans-serif",
                fontSize: 14,
                color: PALETTE.ink,
              }}
            />
          </label>
          {error && (
            <p className="text-[12px]" style={{ color: PALETTE.terracotta }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 px-5 py-3 rounded-full text-[12px] font-semibold uppercase transition disabled:opacity-60"
            style={{
              background: PALETTE.sageDeep,
              color: PALETTE.paper,
              letterSpacing: "0.22em",
              border: `1px solid ${PALETTE.sageDeep}`,
            }}
          >
            {loading ? "Authenticating…" : "Enter"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   EDIT MODAL — non-menu fields only
   ────────────────────────────────────────────── */

function FieldLabel({ children }) {
  return (
    <span
      className="text-[10px] font-semibold uppercase"
      style={{ letterSpacing: "0.22em", color: PALETTE.mist }}
    >
      {children}
    </span>
  );
}

function FieldInput({ value, onChange, type = "text", placeholder = "" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3 py-2 outline-none transition focus:ring-2"
      style={{
        background: PALETTE.paperHi,
        border: `1px solid ${PALETTE.edge}`,
        borderRadius: 8,
        fontSize: 13,
        color: PALETTE.ink,
        fontFamily: "Manrope, sans-serif",
      }}
    />
  );
}

function FieldGroup({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </label>
  );
}

function PillToggle({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([val, label]) => {
        const active = value === val;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase transition"
            style={{
              letterSpacing: "0.18em",
              background: active ? PALETTE.sageDeep : "transparent",
              color: active ? PALETTE.paper : PALETTE.mist,
              border: `1px solid ${active ? PALETTE.sageDeep : PALETTE.edge}`,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function EditModal({ family, onClose, onSave }) {
  const { primary, plusOne, children } = family;
  const [form, setForm] = useState({
    name: primary.name || "",
    email: primary.email || "",
    phone: primary.phone || "",
    attendance: primary.attendance || "",
    events: primary.events || "",
    dietary: primary.dietary || "",
    notes: primary.notes || "",
    transfer: primary.transfer || "",
    arrival_datetime: primary.arrival_datetime || "",
    arrival_location: primary.arrival_location || "",
    return_datetime: primary.return_datetime || "",
    return_location: primary.return_location || "",
    transfer_party_size: primary.transfer_party_size || "",
    plus_one_name: plusOne?.name || "",
    children: children.map((c) => ({ id: c.id, name: c.name || "", dietary: c.dietary || "" })),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field) { return (e) => setForm((f) => ({ ...f, [field]: e.target.value })); }
  function setChild(i, field) {
    return (e) => setForm((f) => ({ ...f, children: f.children.map((c, j) => (j === i ? { ...c, [field]: e.target.value } : c)) }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/private/rsvps/${primary.rsvp_id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) onSave();
      else {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Failed to save.");
      }
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(26,37,32,0.45)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[600px] max-h-[90vh] flex flex-col rounded-[14px] overflow-hidden"
        style={{
          background: PALETTE.paperHi,
          border: `1px solid ${PALETTE.edge}`,
          boxShadow: "0 30px 80px rgba(26,37,32,0.25)",
        }}
      >
        <div
          className="px-6 py-5 flex items-center justify-between gap-4"
          style={{ borderBottom: `1px solid ${PALETTE.edge}` }}
        >
          <div>
            <Kicker>Edit dossier</Kicker>
            <h3 className="font-serif italic mt-1" style={{ color: PALETTE.ink, fontSize: 24 }}>
              {primary.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none transition"
            style={{ color: PALETTE.mist }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-7">
          <section className="flex flex-col gap-4">
            <Kicker accent="sage">Primary</Kicker>
            <div className="grid sm:grid-cols-2 gap-3">
              <FieldGroup label="Name"><FieldInput value={form.name} onChange={set("name")} /></FieldGroup>
              <FieldGroup label="Email"><FieldInput value={form.email} onChange={set("email")} type="email" /></FieldGroup>
              <FieldGroup label="Phone"><FieldInput value={form.phone} onChange={set("phone")} /></FieldGroup>
            </div>
            <FieldGroup label="Attendance">
              <PillToggle
                value={form.attendance}
                onChange={(v) => setForm((f) => ({ ...f, attendance: v }))}
                options={[["yes", "Attending"], ["no", "Declined"]]}
              />
            </FieldGroup>
            {form.attendance !== "no" && (
              <FieldGroup label="Events">
                <PillToggle
                  value={form.events}
                  onChange={(v) => setForm((f) => ({ ...f, events: v }))}
                  options={[["weddingAndBrunch", "Wedding + Brunch"], ["weddingOnly", "Wedding only"], ["brunchOnly", "Brunch only"]]}
                />
              </FieldGroup>
            )}
            <FieldGroup label="Dietary">
              <FieldInput value={form.dietary} onChange={set("dietary")} placeholder="None" />
            </FieldGroup>
            <FieldGroup label="Notes">
              <textarea
                value={form.notes}
                onChange={set("notes")}
                rows={3}
                className="w-full px-3 py-2 outline-none resize-none focus:ring-2"
                style={{
                  background: PALETTE.paperHi,
                  border: `1px solid ${PALETTE.edge}`,
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: "Manrope, sans-serif",
                  color: PALETTE.ink,
                }}
              />
            </FieldGroup>
            <p className="text-[11px] italic" style={{ color: PALETTE.mistSoft, fontFamily: "Cormorant Garamond, serif" }}>
              Course choices are managed in the <span style={{ color: PALETTE.gold }}>Service</span> tab.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <Kicker accent="sage">Transport</Kicker>
            <FieldGroup label="Needs transfer?">
              <PillToggle
                value={form.transfer}
                onChange={(v) => setForm((f) => ({ ...f, transfer: v }))}
                options={[["yes", "Yes"], ["no", "No"], ["", "Not answered"]]}
              />
            </FieldGroup>
            {form.transfer === "yes" && (
              <div className="grid sm:grid-cols-2 gap-3">
                <FieldGroup label="Arrival date/time"><FieldInput value={form.arrival_datetime} onChange={set("arrival_datetime")} placeholder="9 May 10:00" /></FieldGroup>
                <FieldGroup label="Arrival location"><FieldInput value={form.arrival_location} onChange={set("arrival_location")} placeholder="CDG, Orly..." /></FieldGroup>
                <FieldGroup label="Return date/time"><FieldInput value={form.return_datetime} onChange={set("return_datetime")} placeholder="10 May 17:00" /></FieldGroup>
                <FieldGroup label="Return location"><FieldInput value={form.return_location} onChange={set("return_location")} placeholder="CDG, Orly..." /></FieldGroup>
                <FieldGroup label="Party size"><FieldInput value={form.transfer_party_size} onChange={set("transfer_party_size")} type="number" /></FieldGroup>
              </div>
            )}
          </section>

          {plusOne && (
            <section className="flex flex-col gap-4">
              <Kicker accent="sage">Plus-one</Kicker>
              <FieldGroup label="Name"><FieldInput value={form.plus_one_name} onChange={set("plus_one_name")} /></FieldGroup>
            </section>
          )}

          {form.children.length > 0 && (
            <section className="flex flex-col gap-4">
              <Kicker accent="sage">Children</Kicker>
              {form.children.map((child, i) => (
                <div key={child.id} className="grid sm:grid-cols-2 gap-3">
                  <FieldGroup label={`Child ${i + 1}`}><FieldInput value={child.name} onChange={setChild(i, "name")} /></FieldGroup>
                  <FieldGroup label="Dietary"><FieldInput value={child.dietary} onChange={setChild(i, "dietary")} placeholder="None" /></FieldGroup>
                </div>
              ))}
            </section>
          )}

          {error && <p style={{ color: PALETTE.terracotta }} className="text-sm">{error}</p>}
        </div>

        <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: `1px solid ${PALETTE.edge}` }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-[11px] font-semibold uppercase transition"
            style={{ letterSpacing: "0.22em", color: PALETTE.mist }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-full text-[11px] font-semibold uppercase transition disabled:opacity-60"
            style={{
              letterSpacing: "0.22em",
              background: PALETTE.sageDeep,
              color: PALETTE.paper,
              border: `1px solid ${PALETTE.sageDeep}`,
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DeleteModal({ family, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/private/rsvps/${family.primary.rsvp_id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) onConfirm();
      else {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Failed to delete.");
      }
    } catch { setError("Network error."); }
    finally { setDeleting(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(26,37,32,0.45)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-[14px] p-6 flex flex-col gap-5"
        style={{
          background: PALETTE.paperHi,
          border: `1px solid ${PALETTE.edge}`,
          boxShadow: "0 30px 80px rgba(26,37,32,0.25)",
        }}
      >
        <div className="flex flex-col gap-2">
          <Kicker accent="sage">Permanent</Kicker>
          <h3 className="font-serif" style={{ color: PALETTE.ink, fontSize: 24 }}>
            Remove <span style={{ fontStyle: "italic" }}>{family.primary.name}</span>?
          </h3>
          <p style={{ color: PALETTE.mist, fontSize: 13, lineHeight: 1.5 }}>
            This deletes the entire dossier — primary, +1, kids and any choices.
          </p>
        </div>
        {error && <p style={{ color: PALETTE.terracotta }} className="text-sm">{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[11px] font-semibold uppercase"
            style={{ letterSpacing: "0.22em", color: PALETTE.mist }}
          >
            Keep
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-5 py-2 rounded-full text-[11px] font-semibold uppercase transition disabled:opacity-60"
            style={{
              letterSpacing: "0.22em",
              background: PALETTE.terracotta,
              color: PALETTE.paper,
              border: `1px solid ${PALETTE.terracotta}`,
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   MAIN
   ────────────────────────────────────────────── */

export default function AdminGuests() {
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [people, setPeople] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    fetch("/api/private/session", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => setAuthenticated(Boolean(json.authenticated)))
      .catch(() => setAuthenticated(false))
      .finally(() => setSessionLoading(false));
  }, []);

  const fetchPeople = useCallback(() => {
    setDataLoading(true);
    fetch("/api/private/rsvps", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setPeople(Array.isArray(data) ? data : []))
      .catch(() => setPeople([]))
      .finally(() => setDataLoading(false));
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetchPeople();
  }, [authenticated, fetchPeople]);

  async function handleLogout() {
    await fetch("/api/private/logout", { method: "POST", credentials: "include" });
    setAuthenticated(false);
    setPeople([]);
  }

  const families = useMemo(() => groupFamilies(people), [people]);
  const stats = useMemo(() => {
    const attending = people.filter(isAttending);
    const notAttending = people.filter((p) => p.guest_type === "primary" && p.attendance === "no");
    const primaries = attending.filter((p) => p.guest_type === "primary");
    const plusOnes = attending.filter((p) => p.guest_type === "plus_one");
    const kids = attending.filter((p) => p.guest_type === "child");
    const adults = primaries.concat(plusOnes);
    const courseProgress = COURSES.map((c) => ({
      course: c,
      filled: adults.filter((p) => p[c]).length,
      total: adults.length,
    }));
    const fullyPicked = adults.filter((p) => courseFilledCount(p) === 3).length;
    const dietaryList = attending
      .filter((p) => p.dietary?.trim())
      .map((p) => ({ name: p.name, type: p.guest_type, dietary: p.dietary.trim() }));
    const needsTransfer = primaries.filter((p) => p.transfer === "yes");
    const transferPeople = needsTransfer.reduce((s, p) => s + (parseInt(p.transfer_party_size) || 1), 0);
    const noTransfer = primaries.filter((p) => p.transfer === "no");
    const notAnsweredTransfer = primaries.filter((p) => !p.transfer);
    return {
      attending, notAttending, primaries, plusOnes, kids, adults,
      courseProgress, fullyPicked, dietaryList,
      needsTransfer, transferPeople, noTransfer, notAnsweredTransfer,
    };
  }, [people]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PALETTE.paper }}>
        <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: "0.22em", color: PALETTE.mist }}>
          Opening the dossier…
        </span>
      </div>
    );
  }

  if (!authenticated) return <LoginForm onLogin={() => setAuthenticated(true)} />;

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        background: `
          radial-gradient(ellipse at top right, rgba(164,124,46,0.06), transparent 50%),
          radial-gradient(ellipse at bottom left, rgba(45,67,57,0.06), transparent 55%),
          linear-gradient(180deg, ${PALETTE.paper} 0%, #f6efde 100%)
        `,
        color: PALETTE.ink,
      }}
    >
      <Masthead onLogout={handleLogout} peopleCount={people.length} attendingCount={stats.attending.length} />
      <Nav tab={tab} onChange={setTab} />

      <main className="max-w-7xl mx-auto px-5 sm:px-8 pt-6">
        {dataLoading ? (
          <div className="py-24 text-center text-[11px] font-semibold uppercase" style={{ letterSpacing: "0.22em", color: PALETTE.mist }}>
            Gathering the guests…
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
            >
              {tab === "overview" && <OverviewTab stats={stats} families={families} />}
              {tab === "guests" && <FamiliesTab families={families} refresh={fetchPeople} />}
              {tab === "courses" && <CoursesTab families={families} refresh={fetchPeople} />}
              {tab === "menu" && <KitchenTallyTab stats={stats} />}
              {tab === "transport" && <TransportTab stats={stats} />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

/* ──────────────────────────────────────────────
   OVERVIEW
   ────────────────────────────────────────────── */

function OverviewTab({ stats, families }) {
  const attendingFamilies = families.filter((f) => f.attending);

  return (
    <div className="flex flex-col gap-8">
      <SectionTitle
        kicker="Tableau de bord"
        title="At a glance"
        sub="Where everything stands, seven days out."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile index={0} label="Total attending" value={stats.attending.length} sub="dining seats reserved" tone="info" />
        <StatTile index={1} label="Families" value={attendingFamilies.length} />
        <StatTile index={2} label="Guests" value={stats.primaries.length} />
        <StatTile index={3} label="Plus-ones" value={stats.plusOnes.length} />
        <StatTile index={4} label="Children" value={stats.kids.length} sub="kids menu" />
        <StatTile index={5} label="Declined" value={stats.notAttending.length} tone={stats.notAttending.length ? "warn" : "default"} />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <CourseCompletionCard stats={stats} />
        <DietaryCard list={stats.dietaryList} />
      </div>

      <TransportSnapshot stats={stats} />
    </div>
  );
}

function CourseCompletionCard({ stats }) {
  const adults = stats.adults.length;

  return (
    <Surface elevated className="p-6">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div className="flex flex-col gap-1.5">
          <Kicker>Course completion</Kicker>
          <h3 className="font-serif italic" style={{ color: PALETTE.ink, fontSize: 26 }}>
            Picks coming in
          </h3>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-serif tabular-nums" style={{ fontSize: 30, color: PALETTE.ink, lineHeight: 1 }}>
            {stats.fullyPicked}
            <span style={{ color: PALETTE.mistSoft, fontSize: 18 }}>/{adults}</span>
          </span>
          <span className="text-[10px] font-semibold uppercase mt-1" style={{ letterSpacing: "0.22em", color: PALETTE.mist }}>
            Three-course locked
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {stats.courseProgress.map(({ course, filled, total }) => {
          const pct = total === 0 ? 0 : (filled / total) * 100;
          return (
            <div key={course} className="flex items-center gap-4">
              <span
                className="font-serif italic"
                style={{ color: PALETTE.sageDeep, width: 84, fontSize: 18 }}
              >
                {COURSE_LABEL[course]}
              </span>
              <div className="flex-1 h-3.5 relative" style={{ background: "rgba(45,67,57,0.07)", borderRadius: 999, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    height: "100%",
                    background: `linear-gradient(90deg, ${PALETTE.sageDeep}, ${PALETTE.gold})`,
                    borderRadius: 999,
                  }}
                />
              </div>
              <span
                className="tabular-nums"
                style={{ color: PALETTE.ink, fontSize: 13, width: 70, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
              >
                <span className="font-serif" style={{ fontSize: 18 }}>{filled}</span>
                <span style={{ color: PALETTE.mistSoft }}> / {total}</span>
              </span>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

function DietaryCard({ list }) {
  return (
    <Surface elevated className="p-6 flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1.5">
          <Kicker>Dietary</Kicker>
          <h3 className="font-serif italic" style={{ color: PALETTE.ink, fontSize: 26 }}>
            Allergies &amp; notes
          </h3>
        </div>
        <span className="font-serif tabular-nums" style={{ fontSize: 30, color: PALETTE.ink, lineHeight: 1 }}>
          {list.length}
        </span>
      </div>

      {list.length === 0 ? (
        <p className="text-[13px] italic" style={{ color: PALETTE.mistSoft, fontFamily: "Cormorant Garamond, serif" }}>
          Nothing flagged. The kitchen is happy.
        </p>
      ) : (
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {list.map((d, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
              style={{ background: PALETTE.terraSoft, border: `1px solid rgba(184,84,58,0.18)` }}
            >
              <span style={{ color: PALETTE.terracotta, fontSize: 14, marginTop: 2 }}>⚠</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium" style={{ color: PALETTE.ink, fontSize: 13 }}>{d.name}</span>
                  {d.type !== "primary" && <TypePill type={d.type} />}
                </div>
                <p className="text-[12px] mt-0.5" style={{ color: "#7a3a26" }}>{d.dietary}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Surface>
  );
}

function TransportSnapshot({ stats }) {
  return (
    <Surface elevated className="p-6">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div className="flex flex-col gap-1.5">
          <Kicker>Voiturage</Kicker>
          <h3 className="font-serif italic" style={{ color: PALETTE.ink, fontSize: 26 }}>
            Transfers
          </h3>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Need transfer" value={stats.needsTransfer.length} sub={`${stats.transferPeople} people total`} tone="info" />
        <StatTile label="Total people" value={stats.transferPeople} />
        <StatTile label="No transfer" value={stats.noTransfer.length} />
        <StatTile label="Not answered" value={stats.notAnsweredTransfer.length} tone={stats.notAnsweredTransfer.length ? "warn" : "default"} />
      </div>
    </Surface>
  );
}

/* ──────────────────────────────────────────────
   FAMILIES
   ────────────────────────────────────────────── */

function FamilyCard({ family, onEdit, onDelete }) {
  const { primary, plusOne, children } = family;
  const allMembers = [primary, plusOne, ...children].filter(Boolean);
  const attending = family.attending;

  return (
    <Surface
      className="p-0 overflow-hidden flex flex-col"
      style={{ opacity: attending ? 1 : 0.55 }}
    >
      <div
        className="px-5 py-4 flex items-start justify-between gap-3"
        style={{ borderBottom: `1px solid ${PALETTE.edge}` }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-serif" style={{ color: PALETTE.ink, fontSize: 22, lineHeight: 1.1 }}>
              {primary.name}
            </h3>
            {!attending && <Pill tone="warn">Declined</Pill>}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap" style={{ color: PALETTE.mist, fontSize: 11 }}>
            {primary.email && <span className="truncate max-w-[180px]">{primary.email}</span>}
            {primary.email && primary.phone && <span style={{ color: PALETTE.edgeStrong }}>·</span>}
            {primary.phone && <span>{primary.phone}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {attending && primary.events && (
            <span className="text-[10px] font-semibold uppercase" style={{ letterSpacing: "0.2em", color: PALETTE.gold }}>
              {primary.events.replace(/([A-Z])/g, " $1").trim()}
            </span>
          )}
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(family)}
              className="text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full transition"
              style={{
                letterSpacing: "0.2em",
                color: PALETTE.sageDeep,
                border: `1px solid ${PALETTE.edge}`,
              }}
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(family)}
              className="text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full transition"
              style={{
                letterSpacing: "0.2em",
                color: PALETTE.terracotta,
                border: `1px solid rgba(184,84,58,0.32)`,
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {attending && (
        <div className="px-5 py-3">
          <table className="w-full" style={{ fontSize: 13 }}>
            <tbody>
              {allMembers.map((p) => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${PALETTE.edge}` }}>
                  <td className="py-2.5 pr-3 font-medium" style={{ color: PALETTE.ink, whiteSpace: "nowrap" }}>
                    {p.name || <em style={{ color: PALETTE.mistSoft }}>unnamed</em>}
                  </td>
                  <td className="py-2.5 pr-3"><TypePill type={p.guest_type} /></td>
                  <td className="py-2.5 pr-3">
                    {p.guest_type === "child" ? (
                      <Pill tone="child">Kids menu</Pill>
                    ) : (
                      <CourseDots person={p} />
                    )}
                  </td>
                  <td className="py-2.5 text-[11px]" style={{ color: PALETTE.terracotta }}>
                    {p.dietary || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {primary.transfer === "yes" && (
            <div
              className="mt-3 px-3 py-2.5 rounded-lg"
              style={{ background: "rgba(86,121,77,0.08)", border: "1px solid rgba(86,121,77,0.20)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase" style={{ letterSpacing: "0.2em", color: "#3f5938" }}>
                  Transfer needed
                </span>
                <Pill tone="success">{primary.transfer_party_size || 1} pax</Pill>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11.5px] mt-1.5" style={{ color: "#3f5938" }}>
                {primary.arrival_datetime && <span>↓ {primary.arrival_datetime}</span>}
                {primary.arrival_location && <span>at {primary.arrival_location}</span>}
                {primary.return_datetime && <span>↑ {primary.return_datetime}</span>}
                {primary.return_location && <span>from {primary.return_location}</span>}
              </div>
            </div>
          )}

          {primary.notes && (
            <div className="mt-2 text-[12px] italic" style={{ color: PALETTE.mistSoft, fontFamily: "Cormorant Garamond, serif" }}>
              “{primary.notes}”
            </div>
          )}
        </div>
      )}
    </Surface>
  );
}

function FamiliesTab({ families, refresh }) {
  const attending = families.filter((f) => f.attending);
  const declined = families.filter((f) => !f.attending);
  const [editingFamily, setEditingFamily] = useState(null);
  const [deletingFamily, setDeletingFamily] = useState(null);

  return (
    <div className="flex flex-col gap-8">
      {editingFamily && (
        <EditModal
          family={editingFamily}
          onClose={() => setEditingFamily(null)}
          onSave={() => { setEditingFamily(null); refresh(); }}
        />
      )}
      {deletingFamily && (
        <DeleteModal
          family={deletingFamily}
          onClose={() => setDeletingFamily(null)}
          onConfirm={() => { setDeletingFamily(null); refresh(); }}
        />
      )}

      <SectionTitle
        kicker="The roster"
        title="Families"
        sub={`${attending.length} attending · ${declined.length} declined`}
      />

      {attending.length === 0 ? (
        <Surface className="p-12 text-center">
          <p className="font-serif italic" style={{ color: PALETTE.mistSoft, fontSize: 22 }}>
            No replies on record.
          </p>
        </Surface>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {attending.map((f, i) => (
            <motion.div
              key={f.primary.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: clamp(i * 0.025, 0, 0.4) }}
            >
              <FamilyCard family={f} onEdit={setEditingFamily} onDelete={setDeletingFamily} />
            </motion.div>
          ))}
        </div>
      )}

      {declined.length > 0 && (
        <>
          <div className="flex items-center gap-3 mt-2">
            <HairlineRule className="flex-1" />
            <span className="text-[10px] font-semibold uppercase" style={{ letterSpacing: "0.22em", color: PALETTE.mist }}>
              With regrets
            </span>
            <HairlineRule className="flex-1" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {declined.map((f) => (
              <FamilyCard key={f.primary.id} family={f} onEdit={setEditingFamily} onDelete={setDeletingFamily} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   COURSES (per-attendee editable table)
   ────────────────────────────────────────────── */

function CoursesTab({ families, refresh }) {
  const attending = families.filter((f) => f.attending);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");

  const rows = useMemo(() => {
    const list = [];
    for (const fam of attending) {
      const { primary, plusOne, children } = fam;
      list.push({ kind: "primary", rsvpId: primary.rsvp_id, person: primary, family: fam, kids: children.length });
      if (plusOne) list.push({ kind: "plusOne", rsvpId: primary.rsvp_id, person: plusOne, family: fam, kids: 0 });
    }
    list.sort((a, b) => {
      const an = a.family.primary.name || "";
      const bn = b.family.primary.name || "";
      if (an !== bn) return an.localeCompare(bn);
      return a.kind === "primary" ? -1 : 1;
    });
    return list;
  }, [attending]);

  const totals = useMemo(() => {
    const total = rows.length;
    let complete = 0, partial = 0, empty = 0;
    for (const r of rows) {
      const filled = courseFilledCount(r.person);
      if (filled === 3) complete += 1;
      else if (filled === 0) empty += 1;
      else partial += 1;
    }
    return { total, complete, partial, empty };
  }, [rows]);

  async function update(row, course, value) {
    const key = `${row.rsvpId}:${row.kind}:${course}`;
    setSavingKey(key);
    setError("");
    const target = row.kind === "primary" ? "primary" : "plusOne";
    try {
      const res = await fetch(`/api/private/menu/${row.rsvpId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [target]: { [course]: value } }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Failed to save.");
        return;
      }
      refresh();
    } catch { setError("Network error."); }
    finally { setSavingKey(""); }
  }

  return (
    <div className="flex flex-col gap-7">
      <SectionTitle
        kicker="Le service"
        title="Courses"
        sub="Each attending adult, one starter, one main, one dessert. Tap a cell to record or change a pick."
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Adult attendees" value={totals.total} sub="awaiting picks" tone="info" />
        <StatTile label="Three-course locked" value={totals.complete} tone="success" />
        <StatTile label="Half-pencilled" value={totals.partial} tone={totals.partial ? "warn" : "default"} sub="needs follow-up" />
        <StatTile label="Untouched" value={totals.empty} tone={totals.empty ? "warn" : "default"} />
      </div>

      {error && <p style={{ color: PALETTE.terracotta }} className="text-sm">{error}</p>}

      {rows.length === 0 ? (
        <Surface className="p-12 text-center">
          <p className="font-serif italic" style={{ color: PALETTE.mistSoft, fontSize: 22 }}>
            No attending guests yet.
          </p>
        </Surface>
      ) : (
        <Surface elevated className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]" style={{ fontSize: 13, borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  {[
                    { id: "name", label: "Guest", w: "auto" },
                    { id: "type", label: "Role", w: 120 },
                    { id: "starter", label: "Entrée" },
                    { id: "main", label: "Plat" },
                    { id: "dessert", label: "Dessert" },
                    { id: "status", label: "Status", w: 110 },
                  ].map((h) => (
                    <th
                      key={h.id}
                      className="font-serif italic text-left px-3.5 py-3"
                      style={{
                        color: PALETTE.sageDeep,
                        fontSize: 16,
                        fontWeight: 500,
                        background: "rgba(45,67,57,0.04)",
                        borderBottom: `1px solid ${PALETTE.goldLine}`,
                        width: h.w,
                      }}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const filled = courseFilledCount(row.person);
                  const status =
                    filled === 3 ? { tone: "success", label: "Complete" } :
                    filled === 0 ? { tone: "warn", label: "Empty" } :
                    { tone: "gold", label: `${filled}/3` };

                  return (
                    <tr
                      key={`${row.rsvpId}-${row.kind}`}
                      style={{
                        borderBottom: `1px solid ${PALETTE.edge}`,
                        background: row.kind === "plusOne" ? "rgba(132,90,150,0.03)" : "transparent",
                      }}
                    >
                      <td className="px-3.5 py-3 align-top">
                        <div className={row.kind === "plusOne" ? "pl-3" : ""} style={row.kind === "plusOne" ? { borderLeft: "2px solid rgba(132,90,150,0.4)" } : {}}>
                          <span className="font-serif" style={{ color: PALETTE.ink, fontSize: 17 }}>
                            {row.person.name || <em style={{ color: PALETTE.mistSoft }}>unnamed</em>}
                          </span>
                          {row.kind === "primary" && row.kids > 0 && (
                            <span className="block text-[11px] italic mt-0.5" style={{ color: PALETTE.mistSoft, fontFamily: "Cormorant Garamond, serif" }}>
                              + {row.kids} kid{row.kids > 1 ? "s" : ""} on the kids menu
                            </span>
                          )}
                          {row.person.dietary && (
                            <span className="block text-[11px] mt-0.5" style={{ color: PALETTE.terracotta }}>
                              ⚠ {row.person.dietary}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 align-top">
                        <TypePill type={row.kind === "primary" ? "primary" : "plus_one"} />
                      </td>
                      {COURSES.map((course) => {
                        const key = `${row.rsvpId}:${row.kind}:${course}`;
                        return (
                          <td key={course} className="px-3.5 py-3 align-top" style={{ minWidth: 220 }}>
                            <CoursePicker
                              value={row.person[course] || ""}
                              course={course}
                              disabled={savingKey === key}
                              onChange={(v) => update(row, course, v)}
                            />
                          </td>
                        );
                      })}
                      <td className="px-3.5 py-3 align-top">
                        <Pill tone={status.tone}>{status.label}</Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Surface>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   KITCHEN TALLY (Menu tab — for sharing with the venue)
   ────────────────────────────────────────────── */

function KitchenTallyTab({ stats }) {
  const adults = stats.adults;
  const tallies = useMemo(() => {
    return MENU_SECTIONS.map((section) => {
      const buckets = new Map();
      for (const opt of section.options) {
        buckets.set(opt.label, { option: opt, people: [] });
      }
      const unspecified = [];
      for (const p of adults) {
        const value = p[section.id];
        if (!value) { unspecified.push(p); continue; }
        if (!buckets.has(value)) buckets.set(value, { option: { id: value, label: value }, people: [] });
        buckets.get(value).people.push(p);
      }
      const ordered = section.options.map((o) => buckets.get(o.label));
      // include any rogue values not in canonical list
      for (const [label, b] of buckets.entries()) {
        if (!section.options.find((o) => o.label === label)) ordered.push(b);
      }
      return { section, ordered, unspecified };
    });
  }, [adults]);

  const kidsCount = stats.kids.length;

  function handleCopy() {
    const lines = ["Wedding · Roncemay · Course tally", ""];
    for (const { section, ordered, unspecified } of tallies) {
      lines.push(`${section.title.toUpperCase()}`);
      for (const b of ordered) {
        lines.push(`  ${b.people.length.toString().padStart(2, " ")} · ${b.option.label}`);
      }
      if (unspecified.length) lines.push(`  ${unspecified.length.toString().padStart(2, " ")} · — pas encore choisi —`);
      lines.push("");
    }
    if (kidsCount) lines.push(`KIDS: ${kidsCount}`);
    navigator.clipboard?.writeText(lines.join("\n"));
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          kicker="Pour la cuisine"
          title="Kitchen tally"
          sub={`Counts to share with Domaine du Roncemay · ${adults.length} adults · ${kidsCount} kids`}
        />
        <button
          onClick={handleCopy}
          className="px-4 py-2 rounded-full text-[11px] font-semibold uppercase transition"
          style={{
            letterSpacing: "0.22em",
            background: PALETTE.sageDeep,
            color: PALETTE.paper,
            border: `1px solid ${PALETTE.sageDeep}`,
          }}
        >
          Copy as plain text
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {tallies.map(({ section, ordered, unspecified }) => (
          <Surface key={section.id} elevated className="p-5 flex flex-col gap-4">
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-1">
                <Kicker>{COURSE_LABEL[section.id]}</Kicker>
                <h3 className="font-serif italic" style={{ color: PALETTE.ink, fontSize: 22 }}>{section.title}</h3>
              </div>
              <span className="font-serif tabular-nums" style={{ fontSize: 26, color: PALETTE.ink, lineHeight: 1 }}>
                {ordered.reduce((s, b) => s + b.people.length, 0)}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {ordered.map((b) => (
                <TallyRow key={b.option.label} option={b.option} people={b.people} />
              ))}
              {unspecified.length > 0 && (
                <TallyRow
                  option={{ id: "_pending", label: "— pas encore choisi —", description: "not yet picked" }}
                  people={unspecified}
                  pending
                />
              )}
            </div>
          </Surface>
        ))}
      </div>

      {kidsCount > 0 && (
        <Surface className="p-5 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Kicker accent="sage">Children</Kicker>
            <h3 className="font-serif italic" style={{ color: PALETTE.ink, fontSize: 20 }}>
              Kids menu reserved
            </h3>
            <p className="text-[12px]" style={{ color: PALETTE.mist }}>
              {stats.kids.map((k) => k.name).filter(Boolean).join(", ")}
            </p>
          </div>
          <span className="font-serif tabular-nums" style={{ fontSize: 36, color: PALETTE.gold, lineHeight: 1 }}>
            {kidsCount}
          </span>
        </Surface>
      )}
    </div>
  );
}

function TallyRow({ option, people, pending = false }) {
  const count = people.length;
  return (
    <div
      className="flex flex-col gap-1.5 p-3 rounded-md"
      style={{
        background: pending ? PALETTE.terraSoft : "rgba(45,67,57,0.04)",
        border: `1px solid ${pending ? "rgba(184,84,58,0.18)" : PALETTE.edge}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p
            className="font-serif"
            style={{
              color: pending ? PALETTE.terracotta : PALETTE.ink,
              fontSize: 14,
              fontStyle: pending ? "italic" : "normal",
              lineHeight: 1.3,
            }}
          >
            {option.label}
          </p>
          {option.description && !pending && (
            <p className="text-[11px] italic mt-0.5" style={{ color: PALETTE.mistSoft }}>
              {option.description}
            </p>
          )}
        </div>
        <span
          className="font-serif tabular-nums shrink-0"
          style={{
            fontSize: 22,
            color: pending ? PALETTE.terracotta : PALETTE.gold,
            lineHeight: 1,
            minWidth: 24,
            textAlign: "right",
          }}
        >
          {count}
        </span>
      </div>
      {count > 0 && (
        <div className="flex flex-wrap gap-1">
          {people.map((p) => (
            <span
              key={p.id}
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{
                background: pending ? "rgba(184,84,58,0.06)" : "rgba(255,251,240,0.6)",
                color: pending ? "#7a3a26" : PALETTE.mist,
                border: `1px solid ${pending ? "rgba(184,84,58,0.16)" : PALETTE.edge}`,
              }}
            >
              {p.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   TRANSPORT
   ────────────────────────────────────────────── */

function TransportTab({ stats }) {
  const { needsTransfer, noTransfer, notAnsweredTransfer, transferPeople } = stats;

  return (
    <div className="flex flex-col gap-7">
      <SectionTitle
        kicker="Voiturage"
        title="Transport"
        sub={`${transferPeople} people booked across ${needsTransfer.length} parties`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Need transfer" value={needsTransfer.length} sub={`${transferPeople} people total`} tone="info" />
        <StatTile label="Total people" value={transferPeople} />
        <StatTile label="No transfer" value={noTransfer.length} />
        <StatTile label="Not answered" value={notAnsweredTransfer.length} tone={notAnsweredTransfer.length ? "warn" : "default"} />
      </div>

      {needsTransfer.length > 0 && (
        <Surface elevated className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]" style={{ fontSize: 13, borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  {["Party", "Pax", "Arrival", "Return"].map((h) => (
                    <th
                      key={h}
                      className="font-serif italic text-left px-4 py-3"
                      style={{
                        color: PALETTE.sageDeep,
                        fontSize: 16,
                        fontWeight: 500,
                        background: "rgba(45,67,57,0.04)",
                        borderBottom: `1px solid ${PALETTE.goldLine}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {needsTransfer.map((p) => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${PALETTE.edge}` }}>
                    <td className="px-4 py-3 font-serif" style={{ color: PALETTE.ink, fontSize: 17 }}>{p.name}</td>
                    <td className="px-4 py-3"><Pill tone="success">{p.transfer_party_size || 1} pax</Pill></td>
                    <td className="px-4 py-3" style={{ color: PALETTE.ink }}>
                      <div className="text-[12px] italic" style={{ fontFamily: "Cormorant Garamond, serif", color: PALETTE.gold }}>
                        ↓ arrival
                      </div>
                      <div className="font-medium" style={{ fontSize: 13 }}>{p.arrival_datetime || <em style={{ color: PALETTE.mistSoft }}>—</em>}</div>
                      <div className="text-[11.5px]" style={{ color: PALETTE.mist }}>{p.arrival_location || ""}</div>
                    </td>
                    <td className="px-4 py-3" style={{ color: PALETTE.ink }}>
                      <div className="text-[12px] italic" style={{ fontFamily: "Cormorant Garamond, serif", color: PALETTE.gold }}>
                        ↑ return
                      </div>
                      <div className="font-medium" style={{ fontSize: 13 }}>{p.return_datetime || <em style={{ color: PALETTE.mistSoft }}>—</em>}</div>
                      <div className="text-[11.5px]" style={{ color: PALETTE.mist }}>{p.return_location || ""}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {noTransfer.length > 0 && (
          <Surface className="p-5">
            <Kicker accent="sage">No transfer</Kicker>
            <p className="font-serif italic mt-1 mb-3" style={{ color: PALETTE.ink, fontSize: 18 }}>
              Self-arranged
            </p>
            <div className="flex flex-wrap gap-1.5">
              {noTransfer.map((p) => (
                <span key={p.id} className="text-[11.5px] px-2.5 py-0.5 rounded-full" style={{
                  background: "rgba(45,67,57,0.05)",
                  color: PALETTE.mist,
                  border: `1px solid ${PALETTE.edge}`,
                }}>
                  {p.name}
                </span>
              ))}
            </div>
          </Surface>
        )}
        {notAnsweredTransfer.length > 0 && (
          <Surface className="p-5" style={{ borderColor: "rgba(184,84,58,0.32)" }}>
            <Kicker>Pending</Kicker>
            <p className="font-serif italic mt-1 mb-3" style={{ color: PALETTE.ink, fontSize: 18 }}>
              Awaiting answer
            </p>
            <div className="flex flex-wrap gap-1.5">
              {notAnsweredTransfer.map((p) => (
                <span key={p.id} className="text-[11.5px] px-2.5 py-0.5 rounded-full" style={{
                  background: PALETTE.terraSoft,
                  color: "#7a3a26",
                  border: "1px solid rgba(184,84,58,0.30)",
                }}>
                  {p.name}
                </span>
              ))}
            </div>
          </Surface>
        )}
      </div>
    </div>
  );
}
