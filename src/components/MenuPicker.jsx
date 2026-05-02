import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LuCircleCheck, LuHeart } from "react-icons/lu";

const MENU_TOKEN_KEY = "wedding_menu_token";
const fieldClass =
  "w-full rounded-2xl border border-[rgba(74,99,85,0.16)] bg-[#fffdf9] px-4 py-3 text-sm text-[#1e2a22] outline-none transition focus:border-[rgba(74,99,85,0.3)] focus:ring-2 focus:ring-[rgba(196,160,110,0.45)]";

function FishGlyph({ className = "h-3.5 w-3.5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 12c3.2-4 8-5.5 12-5 0 2.4-1 4-2.5 5 1.5 1 2.5 2.6 2.5 5-4 .5-8.8-1-12-5Z" />
      <path d="M6 12 3.5 9.5M6 12l-2.5 2.5M14.5 10.5h.01" />
    </svg>
  );
}

function LeafGlyph({ className = "h-3.5 w-3.5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M19 5c-6.5.2-11 3.6-13 9 3.8 1.6 8.6.4 11.3-3.1C18.8 9 19.4 7 19 5Z" />
      <path d="M7 17c2.5-3.4 5.7-5.8 9.5-7.3" />
    </svg>
  );
}

function PoultryGlyph({ className = "h-3.5 w-3.5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7.5 14.5c0-3.7 2.8-6.5 6.4-6.5 2.6 0 4.7 2.1 4.7 4.7 0 2-.9 3.8-2.6 5.2-2 1.6-4.2 2.1-6.7 1.6-1.2-.2-1.8-1.7-1-2.7l1.6-2.3Z" />
      <path d="M6.4 14.8 5 13.4a1.7 1.7 0 0 0-2.4 2.4l1.4 1.4a1.7 1.7 0 1 0 2.4-2.4Z" />
    </svg>
  );
}

function DessertGlyph({ className = "h-3.5 w-3.5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 18h14" />
      <path d="M7 18c.4-4.6 2.2-7 5-7s4.6 2.4 5 7" />
      <path d="M9.2 8.5c0-1.5 1.2-2.7 2.8-2.7 1.5 0 2.8 1.2 2.8 2.7" />
    </svg>
  );
}

function getMenuOptionVisual(sectionId, optionId) {
  const tone = {
    fish: { color: "text-[#6a7f7a]", bg: "bg-[rgba(106,127,122,0.10)]", border: "border-[rgba(106,127,122,0.16)]" },
    vegetarian: { color: "text-[#6c8a5d]", bg: "bg-[rgba(108,138,93,0.11)]", border: "border-[rgba(108,138,93,0.16)]" },
    poultry: { color: "text-[#9b7658]", bg: "bg-[rgba(155,118,88,0.10)]", border: "border-[rgba(155,118,88,0.16)]" },
    dessert: { color: "text-[#b08a4a]", bg: "bg-[rgba(196,160,110,0.12)]", border: "border-[rgba(196,160,110,0.16)]" }
  };

  if (sectionId === "dessert") return { glyph: DessertGlyph, ...tone.dessert };
  if (optionId.includes("fish") || optionId.includes("trout")) return { glyph: FishGlyph, ...tone.fish };
  if (optionId.includes("chicken")) return { glyph: PoultryGlyph, ...tone.poultry };
  return { glyph: LeafGlyph, ...tone.vegetarian };
}

function CourseChoiceField({ sectionId, title, options, value, onChange }) {
  return (
    <div className="grid gap-3">
      <p className="text-sm font-medium uppercase tracking-[0.12em] text-[#4d6858]">{title}</p>
      <div className="grid gap-2">
        {options.map((option) => {
          const visual = getMenuOptionVisual(sectionId, option.id);
          const Glyph = visual.glyph;
          const selected = value === option.label;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.label)}
              className={`rounded-[16px] border px-4 py-3 text-left text-sm leading-6 transition ${
                selected
                  ? "border-[rgba(74,99,85,0.28)] bg-[rgba(255,255,255,0.96)] text-[#1e2a22] shadow-[0_10px_24px_rgba(72,40,23,0.04)]"
                  : "border-[rgba(53,75,62,0.10)] bg-white/75 text-[#354b3e] hover:border-[rgba(53,75,62,0.22)] hover:bg-white"
              }`}
            >
              <span className="flex items-start gap-3">
                <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${visual.bg} ${visual.border} ${visual.color}`}>
                  <Glyph />
                </span>
                <span className="grid gap-0.5">
                  <span className="font-medium">{option.label}</span>
                  {option.description ? (
                    <span className="text-xs italic text-[#6a7f7a]">{option.description}</span>
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GuestMenuChoices({ title, fields, sections, selection, onSelectionChange }) {
  return (
    <div className="grid gap-5 rounded-[24px] border border-[rgba(53,75,62,0.1)] bg-white/70 p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#4d6858]">{title}</p>
      {sections.map((section) => (
        <CourseChoiceField
          key={section.id}
          sectionId={section.id}
          title={fields[section.id]}
          options={section.options}
          value={selection[section.id]}
          onChange={(nextValue) => onSelectionChange(section.id, nextValue)}
        />
      ))}
    </div>
  );
}

function emptySelection() {
  return { starter: "", main: "", dessert: "" };
}

function selectionFromPayload(side) {
  if (!side) return null;
  return { starter: side.starter || "", main: side.main || "", dessert: side.dessert || "" };
}

function isComplete(selection) {
  return Boolean(selection?.starter && selection?.main && selection?.dessert);
}

function firstName(fullName) {
  return (fullName || "").trim().split(/\s+/)[0] || "";
}

export function MenuPicker({ t, sections }) {
  const tt = t.menuPicker;
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem(MENU_TOKEN_KEY) || ""; } catch { return ""; }
  });
  const [contact, setContact] = useState("");
  const [party, setParty] = useState(null);
  const [primarySelection, setPrimarySelection] = useState(emptySelection);
  const [plusOneSelection, setPlusOneSelection] = useState(emptySelection);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const hydrate = useCallback((payload) => {
    setParty(payload);
    setPrimarySelection(selectionFromPayload(payload.primary) || emptySelection());
    setPlusOneSelection(selectionFromPayload(payload.plusOne) || emptySelection());
    setSaved(isComplete(payload.primary) && (!payload.plusOne || isComplete(payload.plusOne)));
    setEditing(false);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setBusy(true);
    fetch(`/api/menu/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((payload) => { if (!cancelled) hydrate(payload); })
      .catch(() => {
        if (cancelled) return;
        try { localStorage.removeItem(MENU_TOKEN_KEY); } catch { /* empty */ }
        setToken("");
      })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [token, hydrate]);

  const handleLookup = useCallback(async (event) => {
    event?.preventDefault?.();
    const value = contact.trim();
    if (!value) return;
    setBusy(true);
    setStatus({ type: "", message: "" });
    try {
      const response = await fetch("/api/menu/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: value })
      });
      if (response.status === 404) {
        setStatus({ type: "error", message: tt.notFound });
        return;
      }
      if (!response.ok) throw new Error("lookup failed");
      const payload = await response.json();
      try { localStorage.setItem(MENU_TOKEN_KEY, payload.token); } catch { /* empty */ }
      setToken(payload.token);
      hydrate(payload);
    } catch {
      setStatus({ type: "error", message: tt.error });
    } finally {
      setBusy(false);
    }
  }, [contact, hydrate, tt]);

  const handleReset = useCallback(() => {
    try { localStorage.removeItem(MENU_TOKEN_KEY); } catch { /* empty */ }
    setToken("");
    setParty(null);
    setPrimarySelection(emptySelection());
    setPlusOneSelection(emptySelection());
    setContact("");
    setStatus({ type: "", message: "" });
    setSaved(false);
    setEditing(false);
  }, []);

  const handleSave = useCallback(async (event) => {
    event?.preventDefault?.();
    if (!isComplete(primarySelection)) {
      setStatus({ type: "error", message: tt.menuMissing });
      return;
    }
    if (party?.plusOne && !isComplete(plusOneSelection)) {
      setStatus({ type: "error", message: tt.plusOneMenuMissing });
      return;
    }
    setBusy(true);
    setStatus({ type: "", message: "" });
    try {
      const response = await fetch(`/api/menu/${encodeURIComponent(token)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary: primarySelection,
          plusOne: party?.plusOne ? plusOneSelection : null
        })
      });
      if (!response.ok) throw new Error("save failed");
      const payload = await response.json();
      hydrate(payload);
      setSaved(true);
    } catch {
      setStatus({ type: "error", message: tt.error });
    } finally {
      setBusy(false);
    }
  }, [party, plusOneSelection, primarySelection, token, hydrate, tt]);

  if (!token || !party) {
    return (
      <div className="grid gap-4 rounded-[22px] border border-[rgba(196,160,110,0.22)] bg-[rgba(255,250,242,0.75)] p-5">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-[#5d3426]">{tt.lookupTitle}</p>
          <p className="text-sm leading-6 text-[#6a5a51]">{tt.lookupPrompt}</p>
        </div>
        <form onSubmit={handleLookup} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <input
            className={fieldClass}
            type="text"
            inputMode="email"
            autoComplete="email"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder={tt.lookupField}
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !contact.trim()}
            className="rounded-full bg-gradient-to-br from-[#4a6355] to-[#4d6858] px-5 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-60"
          >
            {busy ? tt.lookupLoading : tt.lookupCta}
          </button>
        </form>
        {status.message ? (
          <p className={`text-sm ${status.type === "error" ? "text-[#9a4f4f]" : "text-[#6a5a51]"}`}>{status.message}</p>
        ) : null}
        <p className="text-xs leading-6 text-[#9a8479]">{tt.notListedNote}</p>
      </div>
    );
  }

  if (saved && !editing) {
    return (
      <SavedView
        party={party}
        primarySelection={primarySelection}
        plusOneSelection={plusOneSelection}
        sections={sections}
        tt={tt}
        onEdit={() => { setEditing(true); setSaved(false); }}
        onReset={handleReset}
      />
    );
  }

  const primaryFirst = firstName(party.primary?.name);
  const plusOneFirst = firstName(party.plusOne?.name);
  const fields = {
    starter: tt.starterTitle,
    main: tt.mainTitle,
    dessert: tt.dessertTitle
  };

  return (
    <form onSubmit={handleSave} className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[rgba(53,75,62,0.12)] bg-white/70 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4d6858]">{tt.foundLabel}</p>
          <p className="font-serif text-[1.4rem] leading-tight text-[#1e2a22]">
            {party.primary?.name}
            {party.plusOne ? ` & ${party.plusOne.name}` : ""}
          </p>
          {party.kidsCount > 0 ? (
            <p className="mt-1 text-sm text-[#576e63]">
              {party.kidsCount === 1 ? tt.kidsHintOne : tt.kidsHintMany.replace("{count}", String(party.kidsCount))}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-full border border-[rgba(53,75,62,0.16)] bg-white/80 px-4 py-2 text-xs font-semibold text-[#4a6355] transition hover:bg-white"
        >
          {tt.changeGuest}
        </button>
      </div>

      <div className={`grid gap-5 ${party.plusOne ? "lg:grid-cols-2" : ""}`}>
        <GuestMenuChoices
          title={party.plusOne ? `${tt.menuFor} ${primaryFirst || tt.guestOne}` : tt.guestOne}
          fields={fields}
          sections={sections}
          selection={primarySelection}
          onSelectionChange={(courseId, value) => {
            setPrimarySelection((prev) => ({ ...prev, [courseId]: value }));
            if (status.type === "error") setStatus({ type: "", message: "" });
          }}
        />
        {party.plusOne ? (
          <GuestMenuChoices
            title={`${tt.menuFor} ${plusOneFirst || tt.guestTwo}`}
            fields={fields}
            sections={sections}
            selection={plusOneSelection}
            onSelectionChange={(courseId, value) => {
              setPlusOneSelection((prev) => ({ ...prev, [courseId]: value }));
              if (status.type === "error") setStatus({ type: "", message: "" });
            }}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-gradient-to-br from-[#4a6355] to-[#4d6858] px-6 py-3.5 font-bold text-white transition-opacity disabled:opacity-60 md:w-auto"
        >
          {busy ? tt.submitting : tt.submit}
        </button>
        <p className={`min-h-6 text-sm leading-6 ${status.type === "error" ? "text-[#9a4f4f]" : "text-[#576e63]"}`}>
          {status.message}
        </p>
      </div>
    </form>
  );
}

function SavedView({ party, primarySelection, plusOneSelection, sections, tt, onEdit, onReset }) {
  const sectionLabel = Object.fromEntries(sections.map((s) => [s.id, s.title]));
  const primaryFirst = firstName(party.primary?.name);
  const plusOneFirst = firstName(party.plusOne?.name);

  function summary(selection) {
    return sections
      .map((section) => ({ label: sectionLabel[section.id], value: selection[section.id] }))
      .filter((row) => row.value);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="grid gap-6"
    >
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(74,99,85,0.1)] text-[#4a6355]">
          <LuCircleCheck size={32} strokeWidth={1.5} />
        </div>
        <div className="grid gap-2">
          <h3 className="font-serif text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1] text-[#1e2a22]">
            {tt.savedTitle}
            {primaryFirst ? `, ${primaryFirst}${plusOneFirst ? ` & ${plusOneFirst}` : ""}` : ""}.
          </h3>
          <p className="mx-auto max-w-[42ch] text-base leading-7 text-[#576e63]">{tt.savedNote}</p>
        </div>
      </div>

      <div className={`grid gap-4 ${party.plusOne ? "md:grid-cols-2" : ""}`}>
        <SummaryCard
          name={party.plusOne ? `${tt.menuFor} ${primaryFirst}` : tt.yourMenu}
          rows={summary(primarySelection)}
        />
        {party.plusOne ? (
          <SummaryCard
            name={`${tt.menuFor} ${plusOneFirst}`}
            rows={summary(plusOneSelection)}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full border border-[rgba(53,75,62,0.16)] bg-white/80 px-5 py-3 text-sm font-semibold text-[#4a6355] transition hover:bg-white"
        >
          {tt.editCta}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-[#9a8479] underline-offset-2 hover:underline"
        >
          {tt.changeGuest}
        </button>
      </div>

      <div className="flex items-center justify-center gap-3 text-[#c4a06e]">
        <div className="h-px w-12 bg-[rgba(196,160,110,0.4)]" />
        <LuHeart size={14} />
        <div className="h-px w-12 bg-[rgba(196,160,110,0.4)]" />
      </div>
    </motion.div>
  );
}

function SummaryCard({ name, rows }) {
  return (
    <div className="grid gap-3 rounded-[20px] border border-[rgba(53,75,62,0.12)] bg-white/75 p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#4d6858]">{name}</p>
      <ul className="grid gap-2">
        {rows.map((row) => (
          <li key={row.label} className="grid gap-0.5 border-b border-[rgba(53,75,62,0.08)] pb-2 last:border-b-0 last:pb-0">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#9a8479]">{row.label}</span>
            <span className="text-sm leading-6 text-[#1e2a22]">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MenuPicker;
