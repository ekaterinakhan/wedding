import { useMemo, useState, useEffect, useCallback, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cursors } from "./components/Cursors";
import {
  LuMapPin, LuArrowUpRight, LuChevronDown,
  LuHeart, LuCar, LuWine, LuUtensils, LuFlag,
  LuMail, LuMap, LuCalendarDays, LuSunrise, LuCircleCheck,
} from "react-icons/lu";
import PhoneInput, { parsePhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

import en from "./i18n/en.json";
import fr from "./i18n/fr.json";
import OWN_PHOTOS from "./photos.json";

const RSVP_ENDPOINT = import.meta.env.VITE_RSVP_ENDPOINT || "/api/rsvps";
const RSVP_LS_KEY = "wedding_rsvp_confirmed";

const content = { en, fr };

const SHUFFLED_PHOTOS = [...OWN_PHOTOS].sort(() => Math.random() - 0.5);

function getPhoto(i) {
  return SHUFFLED_PHOTOS[i % SHUFFLED_PHOTOS.length];
}

// Per-slot rotation & offset so the pile looks natural
const SLOT = [
  { rotate: 2.5, x: 0, y: 0 },   // top
  { rotate: -3.5, x: -6, y: 9 },   // middle
  { rotate: 4.5, x: 8, y: 16 },   // back
];
const STACK = SLOT.length;

function HeroPhotoStack() {
  const [top, setTop] = useState(0); // absolute index of the card on top

  // Auto-advance
  useEffect(() => {
    const t = setInterval(() => setTop(i => i + 1), 4500);
    return () => clearInterval(t);
  }, []);

  // Pre-load upcoming
  useEffect(() => {
    [1, 2, 3].forEach(off => {
      const { src } = getPhoto(top + off);
      if (!src.startsWith("/")) { const img = new window.Image(); img.src = src; }
    });
  }, [top]);

  // top → slot 0, top+1 → slot 1, top+2 → slot 2
  const cards = Array.from({ length: STACK }, (_, slot) => ({ photoIdx: top + slot, slot }));

  return (
    <div className="flex items-center justify-center lg:justify-end">
      {/* Container is bigger than the card to absorb rotations */}
      <div className="relative" style={{ width: 320, height: 440 }}>
        <AnimatePresence>
          {cards.map(({ photoIdx, slot }) => {
            const photo = getPhoto(photoIdx);
            const { rotate, x, y } = SLOT[slot];
            return (
              <motion.figure
                key={photoIdx}
                className="absolute bg-white"
                style={{
                  width: 260, height: 340,
                  top: "50%", left: "50%",
                  marginTop: -170, marginLeft: -130,
                  zIndex: STACK - slot,
                  borderRadius: 16,
                  boxShadow: "0 4px 6px rgba(0,0,0,0.07), 0 12px 40px rgba(72,40,23,0.18)",
                }}
                initial={{ opacity: 0, scale: 0.88, rotate: SLOT[STACK - 1].rotate, x: SLOT[STACK - 1].x, y: SLOT[STACK - 1].y + 24 }}
                animate={{ opacity: 1, scale: 1 - slot * 0.025, rotate, x, y }}
                exit={{ opacity: 0, rotate: rotate + 20, x: 380, y: -80, scale: 0.8, zIndex: STACK + 1 }}
                transition={{ type: "spring", damping: 26, stiffness: 220 }}
              >
                {/* Photo */}
                <div style={{ margin: 10, marginBottom: 0, height: 272, overflow: "hidden", borderRadius: 10 }}>
                  <img src={photo.src} alt={photo.alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                {/* Polaroid caption strip */}
                <div style={{ height: 58, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 11, color: "#4d6858", opacity: 0.55, letterSpacing: "0.08em" }}>
                    {photo.caption}
                  </span>
                </div>
              </motion.figure>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function getEventIcon(title) {
  const t = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (t.includes("ceremony") || t.includes("civil") || t.includes("ceremonie")) return { icon: <LuHeart size={15} />, bg: "bg-[rgba(180,80,80,0.08)]", color: "text-[#b45050]" };
  if (t.includes("transfer") || t.includes("transfert")) return { icon: <LuCar size={15} />, bg: "bg-[rgba(74,99,85,0.08)]", color: "text-[#4a6355]" };
  if (t.includes("toast") || t.includes("apero") || t.includes("cremant") || t.includes("coupe")) return { icon: <LuWine size={15} />, bg: "bg-[rgba(196,160,110,0.12)]", color: "text-[#b08a4a]" };
  if (t.includes("dinner") || t.includes("brunch") || t.includes("tea") || t.includes("gouter") || t.includes("diner") || t.includes("lunch")) return { icon: <LuUtensils size={15} />, bg: "bg-[rgba(196,160,110,0.12)]", color: "text-[#b08a4a]" };
  if (t.includes("golf")) return { icon: <LuFlag size={15} />, bg: "bg-[rgba(74,99,85,0.08)]", color: "text-[#4a6355]" };
  return { icon: <LuMapPin size={15} />, bg: "bg-[rgba(74,99,85,0.08)]", color: "text-[#4a6355]" };
}

function ScheduleSection({ t }) {
  const [activeDay, setActiveDay] = useState("day1");

  const tabs = [
    { id: "day1", icon: <LuCalendarDays size={13} />, label: t.ui.day1Label, note: t.schedule.note, items: t.scheduleItems },
    { id: "day2", icon: <LuSunrise size={13} />, label: t.ui.day2Label, note: t.nextDay.note, items: t.nextDayItems },
  ];

  const active = tabs.find((tab) => tab.id === activeDay);

  return (
    <SectionCard>
      <div className="mb-6 inline-flex rounded-full border border-[rgba(53,75,62,0.12)] bg-[rgba(248,242,233,0.6)] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveDay(tab.id)}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition ${activeDay === tab.id
              ? "bg-[#4a6355] text-white shadow-sm"
              : "text-[#576e63] hover:text-[#354b3e]"
              }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>
      {active.note && (
        <p className="mb-6 text-[0.8125rem] leading-relaxed text-[#354b3e]">{active.note}</p>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeDay}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="divide-y divide-[rgba(53,75,62,0.08)]"
        >
          {active.items.map((item) => {
            const { icon, bg, color } = getEventIcon(item.title);
            return (
              <div
                key={`${item.time}-${item.title}`}
                className="grid grid-cols-[72px_1fr] gap-x-4 py-4 first:pt-1 last:pb-0 md:grid-cols-[80px_minmax(180px,220px)_1fr_auto] md:items-center md:gap-x-6"
              >
                <div className="text-sm font-semibold tabular-nums text-[#4d6858]">{item.time}</div>
                <h3 className="inline-flex items-center gap-2.5 font-serif text-[1.05rem] leading-snug text-[#1e2a22]">
                  <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg} ${color}`}>{icon}</span>
                  {item.title}
                </h3>
                <p className="col-start-2 mt-0.5 text-sm leading-6 text-[#354b3e] md:col-start-auto md:mt-0">{item.description}</p>
                <a href={item.url} target="_blank" rel="noreferrer"
                  className="col-start-2 mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-[rgba(74,99,85,0.14)] bg-white/60 px-3 py-1 text-[11px] font-medium text-[#4d6858] transition hover:border-[rgba(74,99,85,0.3)] hover:bg-white md:col-start-auto md:mt-0">
                  <LuMapPin size={11} /> {item.location}
                </a>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </SectionCard>
  );
}

const fieldClass =
  "w-full rounded-2xl border border-[rgba(74,99,85,0.16)] bg-[#fffdf9] px-4 py-3 text-sm text-[#1e2a22] outline-none transition focus:border-[rgba(74,99,85,0.3)] focus:ring-2 focus:ring-[rgba(196,160,110,0.45)]";

function App() {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("wedding_lang") || null; } catch { return null; }
  });
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attendance, setAttendance] = useState("");
  const [selectedMain, setSelectedMain] = useState("");
  const [events, setEvents] = useState("");
  const [transfer, setTransfer] = useState("");
  const [arrivalDateTime, setArrivalDateTime] = useState("");
  const [arrivalLocation, setArrivalLocation] = useState("");
  const [returnDateTime, setReturnDateTime] = useState("");
  const [returnLocation, setReturnLocation] = useState("");
  const [transferPartySize, setTransferPartySize] = useState("");
  const [hasPlusOne, setHasPlusOne] = useState("");
  const [plusOneName, setPlusOneName] = useState("");
  const [selectedPlusOneMain, setSelectedPlusOneMain] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("FR");
  const [kids, setKids] = useState([]);
  const [hasKids, setHasKids] = useState("");
  const [menuError, setMenuError] = useState("");
  const [rsvpConfirmed, setRsvpConfirmed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RSVP_LS_KEY)) || null; } catch { return null; }
  });
  const t = content[lang] ?? content["en"];
  const menuRequired = attendance !== "no";
  const plusOneEnabled = menuRequired && hasPlusOne === "yes";

  useEffect(() => {
    fetch("/api/country")
      .then((r) => r.json())
      .then((data) => {
        if (data.country && data.country !== "XX") setPhoneCountry(data.country);
        if (!lang) setLang(data.country === "FR" ? "fr" : "en");
      })
      .catch(() => { if (!lang) setLang("en"); });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    if (menuRequired && !selectedMain) {
      setMenuError("main");
      setStatus(t.rsvp.menuMissing);
      return;
    }
    if (plusOneEnabled && !selectedPlusOneMain) {
      setMenuError("plusOne");
      setStatus(t.rsvp.plusOneMenuMissing);
      return;
    }
    setMenuError("");

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.language = lang;
    payload.submittedAt = new Date().toISOString();
    payload.phone = phone || "";
    payload.kids = kids.filter((k) => k.name.trim());

    setSubmitting(true);
    setStatus("");
    try {
      if (RSVP_ENDPOINT) {
        const response = await fetch(RSVP_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (response.status === 409) {
          const data = await response.json();
          const confirmed = { name: payload.name, plusOneName: payload.plusOneName || "", kids: payload.kids || [], already: true, token: data.token || null };
          localStorage.setItem(RSVP_LS_KEY, JSON.stringify(confirmed));
          setRsvpConfirmed(confirmed);
          return;
        }

        if (!response.ok) {
          throw new Error("Submission failed");
        }

        const data = await response.json();
        const confirmed = { name: payload.name, plusOneName: payload.plusOneName || "", kids: payload.kids || [], already: false, token: data.token || null };
        localStorage.setItem(RSVP_LS_KEY, JSON.stringify(confirmed));
        setRsvpConfirmed(confirmed);
      } else {
        setStatus(t.rsvp.successLocal);
      }

      form.reset();
      setAttendance("");
      setSelectedMain("");
      setEvents("");
      setTransfer("");
      setArrivalDateTime("");
      setArrivalLocation("");
      setReturnDateTime("");
      setReturnLocation("");
      setTransferPartySize("");
      setHasPlusOne("");
      setPlusOneName("");
      setSelectedPlusOneMain("");
      setPhone("");
      setKids([]);
      setHasKids("");
    } catch {
      setStatus(t.rsvp.error);
    } finally {
      setSubmitting(false);
    }
  }, [lang, t, phone, kids, attendance, selectedMain, selectedPlusOneMain, events, transfer, hasPlusOne, menuRequired, plusOneEnabled]);

  return (
    <div className="relative mx-auto my-4 w-[min(calc(100%-20px),1100px)] pb-28 sm:w-[min(calc(100%-48px),1100px)]">
      <header className="relative overflow-hidden rounded-[28px] border border-white/70 bg-[rgba(249,251,247,0.85)] p-5 shadow-[0_24px_80px_rgba(72,40,23,0.08)] backdrop-blur-xl">
        <div className="absolute -right-[10%] -bottom-[20%] h-[340px] w-[340px] rounded-full bg-radial from-[rgba(196,160,110,0.45)] to-transparent" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#4a6355]">{t.ui.siteLabel}</div>
          <div className="inline-flex gap-2 rounded-full border border-[rgba(53,75,62,0.12)] bg-[rgba(249,251,247,0.7)] p-1.5">
            {["en", "fr"].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => { setLang(code); try { localStorage.setItem("wedding_lang", code); } catch { } }}
                className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${lang === code ? "bg-[#4a6355] text-[#fffaf3]" : "text-[#576e63]"
                  }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,400px)] lg:gap-10">
          <div className="max-w-[760px] py-7 md:py-10 lg:py-12">
            <p className="text-xs uppercase tracking-[0.14em] text-[#4a6355]">{t.hero.eyebrow}</p>
            <h1 className="mt-3 font-serif text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.95] text-[#1e2a22]">
              {t.hero.title}
            </h1>
            <p className="mt-4 max-w-[56ch] text-base leading-7 text-[#354b3e]">{t.hero.text}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a className="rounded-full bg-gradient-to-br from-[#4a6355] to-[#4d6858] px-6 py-3.5 font-bold text-white" href="#rsvp">
                {t.hero.primary}
              </a>
              <a
                className="rounded-full border border-[rgba(53,75,62,0.12)] bg-[rgba(249,251,247,0.9)] px-6 py-3.5 font-bold text-[#4a6355]"
                href="#logistics"
              >
                {t.hero.secondary}
              </a>
            </div>
          </div>
          <div className="flex items-center justify-center pb-10 lg:justify-end lg:pb-0">
            <HeroPhotoStack />
          </div>
        </div>
      </header>

      <main className="space-y-3 pt-3">
        <SectionCard>
          <SectionHeading kicker={t.welcome.kicker} title={t.welcome.title} note={t.welcome.text} />
        </SectionCard>

        <ScheduleSection t={t} />

        <SectionCard id="menu">
          <SectionHeading kicker={t.menu.kicker} title={t.menu.title} />
          <div className="flex items-center gap-4 py-2">
            <div className="h-px flex-1 bg-[rgba(53,75,62,0.08)]" />
            <p className="font-serif text-[1rem] italic text-[#4d6858]/50">{t.menu.upcomingNote}</p>
            <div className="h-px flex-1 bg-[rgba(53,75,62,0.08)]" />
          </div>
        </SectionCard>

        <SectionCard id="rsvp">
          <SectionHeading kicker={t.rsvp.kicker} title={t.rsvp.title} note={t.rsvp.note} />
          {rsvpConfirmed ? (
            <RsvpConfirmed name={rsvpConfirmed.name} plusOneName={rsvpConfirmed.plusOneName} kids={rsvpConfirmed.kids || []} already={rsvpConfirmed.already} t={t} />
          ) : (
            <form className="grid gap-8" onSubmit={handleSubmit}>

              {/* Contact */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t.rsvp.fields.name}>
                  <input className={fieldClass} name="name" required />
                </Field>
                <Field label={t.rsvp.fields.email}>
                  <input className={fieldClass} name="email" type="email" required />
                </Field>
                <Field label={t.rsvp.fields.phone}>
                  <PhoneInput
                    international
                    defaultCountry={phoneCountry}
                    value={phone}
                    onChange={setPhone}
                    className="phone-input"
                  />
                </Field>
              </div>

              {/* Attendance toggle */}
              <div className="grid gap-3">
                <p className="text-sm font-medium text-[#1e2a22]">{t.rsvp.fields.attendance}</p>
                <input type="hidden" name="attendance" value={attendance} />
                <div className="flex flex-wrap gap-2">
                  {[["yes", t.rsvp.options.yes], ["no", t.rsvp.options.no]].map(([val, label]) => (
                    <button key={val} type="button" onClick={() => {
                      setAttendance(val);
                      if (val === "no") {
                        setEvents("");
                        setTransfer("");
                        setArrivalDateTime("");
                        setArrivalLocation("");
                        setReturnDateTime("");
                        setReturnLocation("");
                        setTransferPartySize("");
                        setSelectedMain("");
                        setHasPlusOne("");
                        setPlusOneName("");
                        setSelectedPlusOneMain("");
                        setHasKids("");
                        setKids([]);
                      }
                    }}
                      className={`rounded-full px-6 py-3 text-sm font-semibold transition ${attendance === val ? "bg-[#4a6355] text-white shadow-sm" : "border border-[rgba(53,75,62,0.18)] bg-white/60 text-[#354b3e] hover:border-[rgba(53,75,62,0.35)] hover:bg-white"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progressive disclosure */}
              <AnimatePresence>
                {attendance === "yes" && (
                  <motion.div key="yes-fields"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28 }}
                    className="grid gap-8">

                    {/* Events */}
                    <div className="grid gap-3">
                      <p className="text-sm font-medium text-[#1e2a22]">{t.rsvp.fields.events}</p>
                      <input type="hidden" name="events" value={events} />
                      <div className="flex flex-wrap gap-2">
                        {[["wedding-and-brunch", t.rsvp.options.weddingAndBrunch], ["wedding-only", t.rsvp.options.weddingOnly], ["brunch-only", t.rsvp.options.brunchOnly]].map(([val, label]) => (
                          <button key={val} type="button" onClick={() => setEvents(val)}
                            className={`rounded-full px-6 py-3 text-sm font-semibold transition ${events === val ? "bg-[#4a6355] text-white shadow-sm" : "border border-[rgba(53,75,62,0.18)] bg-white/60 text-[#354b3e] hover:border-[rgba(53,75,62,0.35)] hover:bg-white"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Plus one */}
                    <div className="grid gap-4 rounded-[24px] border border-[rgba(71,46,31,0.12)] bg-[#fffaf2] p-5">
                      <div className="grid gap-2">
                        <p className="text-sm font-medium text-[#2a211c]">{t.rsvp.fields.plusOne}</p>
                        <input type="hidden" name="plusOne" value={hasPlusOne} />
                        <div className="flex flex-wrap gap-2">
                          {[["yes", t.rsvp.options.plusOneYes], ["no", t.rsvp.options.plusOneNo]].map(([val, label]) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                setHasPlusOne(val);
                                if (val !== "yes") {
                                  setPlusOneName("");
                                  setSelectedPlusOneMain("");
                                }
                              }}
                              className={`rounded-full px-6 py-3 text-sm font-semibold transition ${hasPlusOne === val
                                ? "bg-[#5d3426] text-white shadow-sm"
                                : "border border-[rgba(71,46,31,0.18)] bg-white/60 text-[#3d2e26] hover:border-[rgba(71,46,31,0.35)] hover:bg-white"
                                }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {plusOneEnabled ? (
                        <Field label={t.rsvp.fields.plusOneName}>
                          <input
                            className={fieldClass}
                            name="plusOneName"
                            value={plusOneName}
                            onChange={(event) => setPlusOneName(event.target.value)}
                            required={plusOneEnabled}
                          />
                        </Field>
                      ) : null}
                    </div>

                    {/* Menu */}
                    <div className="grid gap-4 rounded-[24px] border border-[rgba(53,75,62,0.12)] bg-[#f7f9f6] p-5">
                      <div className="grid gap-2">
                        <h3 className="font-serif text-[clamp(1.5rem,2.5vw,2rem)] leading-[0.95] text-[#1e2a22]">
                          {plusOneEnabled ? t.rsvp.menuGroupTitlePair : t.rsvp.menuGroupTitleSingle}
                        </h3>
                        <p className="text-sm leading-6 text-[#354b3e]">
                          {plusOneEnabled ? t.rsvp.menuGroupNotePair : t.rsvp.menuGroupNoteSingle}
                        </p>
                      </div>

                      <div className={`grid gap-5 ${plusOneEnabled ? "lg:grid-cols-2" : ""}`}>
                        <div className="grid gap-3">
                          <p className="text-sm font-medium text-[#1e2a22]">{t.rsvp.fields.menu}</p>
                          <input type="hidden" name="menu" value={selectedMain} />
                          <div className="flex flex-wrap gap-2">
                            {t.menuOptions.map(([value, label]) => (
                              <button key={value} type="button" onClick={() => { setSelectedMain(value); if (menuError === "main") { setMenuError(""); setStatus(""); } }}
                                className={`rounded-full px-6 py-3 text-sm font-semibold transition ${selectedMain === value ? "bg-[#4a6355] text-white shadow-sm" : "border border-[rgba(53,75,62,0.18)] bg-white/60 text-[#354b3e] hover:border-[rgba(53,75,62,0.35)] hover:bg-white"}`}>
                                {label}
                              </button>
                            ))}
                          </div>
                          {menuError === "main" && <p className="text-sm text-red-600">{t.rsvp.menuMissing}</p>}
                        </div>

                        {plusOneEnabled ? (
                          <div className="grid gap-3">
                            <p className="text-sm font-medium text-[#1e2a22]">{plusOneName.trim() ? `${t.rsvp.fields.plusOneMenuFor} ${plusOneName.trim().split(" ")[0]}` : t.rsvp.fields.plusOneMenu}</p>
                            <input type="hidden" name="plusOneMenu" value={selectedPlusOneMain} />
                            <div className="flex flex-wrap gap-2">
                              {t.menuOptions.map(([value, label]) => (
                                <button key={`plus-${value}`} type="button" onClick={() => { setSelectedPlusOneMain(value); if (menuError === "plusOne") { setMenuError(""); setStatus(""); } }}
                                  className={`rounded-full px-6 py-3 text-sm font-semibold transition ${selectedPlusOneMain === value ? "bg-[#4a6355] text-white shadow-sm" : "border border-[rgba(53,75,62,0.18)] bg-white/60 text-[#354b3e] hover:border-[rgba(53,75,62,0.35)] hover:bg-white"}`}>
                                  {label}
                                </button>
                              ))}
                            </div>
                            {menuError === "plusOne" && <p className="text-sm text-red-600">{t.rsvp.plusOneMenuMissing}</p>}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Transfer */}
                    <div className="grid gap-3">
                      <p className="text-sm font-medium text-[#1e2a22]">{t.rsvp.fields.transfer}</p>
                      <input type="hidden" name="transfer" value={transfer} />
                      <div className="flex flex-wrap gap-2">
                        {[["yes", t.rsvp.options.transferYes], ["no", t.rsvp.options.transferNo]].map(([val, label]) => (
                          <button key={val} type="button" onClick={() => {
                            setTransfer(val);
                            if (val !== "yes") {
                              setArrivalDateTime("");
                              setArrivalLocation("");
                              setReturnDateTime("");
                              setReturnLocation("");
                              setTransferPartySize("");
                            }
                          }}
                            className={`rounded-full px-6 py-3 text-sm font-semibold transition ${transfer === val ? "bg-[#4a6355] text-white shadow-sm" : "border border-[rgba(53,75,62,0.18)] bg-white/60 text-[#354b3e] hover:border-[rgba(53,75,62,0.35)] hover:bg-white"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {transfer === "yes" ? (
                      <div className="grid gap-4 rounded-[24px] border border-[rgba(53,75,62,0.12)] bg-[#f7f9f6] p-5">
                        <div className="grid gap-2">
                          <h3 className="font-serif text-[clamp(1.5rem,2.5vw,2rem)] leading-[0.95] text-[#1e2a22]">
                            {t.rsvp.fields.transferDetails}
                          </h3>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 overflow-hidden">
                          <Field label={t.rsvp.fields.arrivalDateTime}>
                            <input
                              className={`${fieldClass} min-w-0`}
                              name="arrivalDateTime"
                              type="datetime-local"
                              value={arrivalDateTime}
                              onChange={(event) => setArrivalDateTime(event.target.value)}
                              required={transfer === "yes"}
                            />
                          </Field>
                          <Field label={t.rsvp.fields.arrivalLocation}>
                            <input
                              className={fieldClass}
                              name="arrivalLocation"
                              value={arrivalLocation}
                              onChange={(event) => setArrivalLocation(event.target.value)}
                              placeholder={t.ui.transferLocationPlaceholder}
                              required={transfer === "yes"}
                            />
                          </Field>
                          <Field label={t.rsvp.fields.returnDateTime}>
                            <input
                              className={`${fieldClass} min-w-0`}
                              name="returnDateTime"
                              type="datetime-local"
                              value={returnDateTime}
                              onChange={(event) => setReturnDateTime(event.target.value)}
                              required={transfer === "yes"}
                            />
                          </Field>
                          <Field label={t.rsvp.fields.returnLocation}>
                            <input
                              className={fieldClass}
                              name="returnLocation"
                              value={returnLocation}
                              onChange={(event) => setReturnLocation(event.target.value)}
                              placeholder={t.ui.transferLocationPlaceholder}
                              required={transfer === "yes"}
                            />
                          </Field>
                          <Field label={t.rsvp.fields.transferPartySize}>
                            <input
                              className={fieldClass}
                              name="transferPartySize"
                              type="number"
                              inputMode="numeric"
                              min="1"
                              step="1"
                              placeholder="1"
                              value={transferPartySize}
                              onChange={(event) => setTransferPartySize(event.target.value)}
                              required={transfer === "yes"}
                            />
                          </Field>
                        </div>
                      </div>
                    ) : null}

                    {/* Dietary */}
                    <Field label={t.rsvp.fields.dietary}>
                      <textarea className={fieldClass} name="dietary" rows="3" placeholder={t.rsvp.fields.notes} />
                    </Field>

                    {/* Kids */}
                    <div className="grid gap-4 rounded-[24px] border border-[rgba(71,46,31,0.12)] bg-[#fffaf2] p-5">
                      <div className="grid gap-2">
                        <p className="text-sm font-medium text-[#2a211c]">{t.rsvp.kids.question}</p>
                        <div className="flex flex-wrap gap-2">
                          {[["yes", t.rsvp.kids.yes], ["no", t.rsvp.kids.no]].map(([val, label]) => (
                            <button key={val} type="button"
                              onClick={() => { setHasKids(val); if (val === "no") setKids([]); }}
                              className={`rounded-full px-6 py-3 text-sm font-semibold transition ${hasKids === val ? "bg-[#5d3426] text-white shadow-sm" : "border border-[rgba(71,46,31,0.18)] bg-white/60 text-[#3d2e26] hover:border-[rgba(71,46,31,0.35)] hover:bg-white"}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <AnimatePresence>
                        {hasKids === "yes" && (
                          <motion.div key="kids-fields"
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.22 }}
                            className="grid gap-3">
                            <p className="text-xs text-[#6a5a51]">{t.rsvp.kids.note}</p>
                            {kids.map((kid, i) => (
                              <div key={i} className="grid gap-2">
                                <div className="flex gap-2">
                                  <input
                                    className={`${fieldClass} flex-1 min-w-0`}
                                    placeholder={`${t.rsvp.kids.childLabel} ${i + 1} — ${t.rsvp.kids.namePlaceholder}`}
                                    value={kid.name}
                                    onChange={(e) => setKids(k => k.map((c, idx) => idx === i ? { ...c, name: e.target.value } : c))}
                                    required
                                  />
                                  <button type="button"
                                    onClick={() => setKids(k => k.filter((_, idx) => idx !== i))}
                                    className="mt-[2px] flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[rgba(71,46,31,0.18)] text-[#9a7a6a] transition hover:border-[rgba(71,46,31,0.35)] hover:text-[#5d3426]">
                                    ×
                                  </button>
                                </div>
                                <input
                                  className={fieldClass}
                                  placeholder={t.rsvp.kids.dietaryPlaceholder}
                                  value={kid.dietary}
                                  onChange={(e) => setKids(k => k.map((c, idx) => idx === i ? { ...c, dietary: e.target.value } : c))}
                                />
                              </div>
                            ))}
                            {kids.length < 3 && (
                              <button type="button"
                                onClick={() => setKids(k => [...k, { name: "", dietary: "" }])}
                                className="mt-1 self-start rounded-full border border-dashed border-[rgba(71,46,31,0.25)] px-5 py-2.5 text-sm text-[#6a5a51] transition hover:border-[rgba(71,46,31,0.45)] hover:text-[#3d2e26]">
                                {t.rsvp.kids.addChild}
                              </button>
                            )}
                            {kids.length === 3 && (
                              <p className="text-xs text-[#9a7a6a]">{t.rsvp.kids.max}</p>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
                <button type="submit" disabled={submitting}
                  className="w-full rounded-full bg-gradient-to-br from-[#4a6355] to-[#4d6858] px-6 py-3.5 font-bold text-white transition-opacity disabled:opacity-60 md:w-auto">
                  {submitting ? "…" : t.rsvp.submit}
                </button>
                <p className="min-h-6 text-sm leading-6 text-[#576e63]">{status}</p>
              </div>
            </form>
          )}
        </SectionCard>

        <LogisticsSection t={t} />
      </main>

      <footer className="mt-8 py-8 text-center">
        <p className="font-serif text-[clamp(1.4rem,3vw,2rem)] leading-none text-[#4d6858]">
          Ekaterina &amp; Lucas
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#576e63]">{t.ui.footerDate}</p>
        <p className="mt-4 font-mono text-[10px] tracking-widest text-[#4a6355]/40">
          git commit -m "I do" --date="2026-05-09" --author="Ekaterina &amp; Lucas" &amp;&amp; echo "no revert planned"
        </p>
      </footer>

      <StickyBar t={t} />
      <Cursors />
    </div>
  );
}

function RsvpConfirmed({ name, plusOneName, kids, already, t }) {
  const firstName = name ? name.trim().split(" ")[0] : "";
  const plusOneFirst = plusOneName ? plusOneName.trim().split(" ")[0] : "";
  const kidNames = (kids || []).map((k) => k.name.trim().split(" ")[0]).filter(Boolean);

  const kidsLine = kidNames.length > 0
    ? kidNames.length === 1
      ? `${t.rsvp.confirmedKidsNote} ${kidNames[0]} to bring lots of fun!`
      : `${t.rsvp.confirmedKidsNote} ${kidNames.slice(0, -1).join(", ")} & ${kidNames.at(-1)} to bring lots of fun!`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-6 py-10 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(74,99,85,0.1)] text-[#4a6355]">
        <LuCircleCheck size={36} strokeWidth={1.5} />
      </div>
      <div className="grid gap-2">
        <h3 className="font-serif text-[clamp(1.8rem,4vw,2.8rem)] leading-[1] text-[#1e2a22]">
          {t.rsvp.confirmedTitle}
          {firstName ? `, ${firstName}${plusOneFirst ? ` & ${plusOneFirst}` : ""}` : ""}.
        </h3>
        <p className="mx-auto max-w-[42ch] text-base leading-7 text-[#576e63]">
          {already ? t.rsvp.confirmedAlreadyNote : t.rsvp.confirmedNote}
        </p>
        {kidsLine && (
          <p className="mx-auto mt-1 max-w-[42ch] text-sm italic leading-6 text-[#9a7a6a]">
            {kidsLine}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 text-[#c4a06e]">
        <div className="h-px w-12 bg-[rgba(196,160,110,0.4)]" />
        <LuHeart size={14} />
        <div className="h-px w-12 bg-[rgba(196,160,110,0.4)]" />
      </div>
      <p className="text-xs uppercase tracking-[0.18em] text-[#4d6858]">{t.ui.footerDate}</p>
    </motion.div>
  );
}

function SectionCard({ children, id }) {
  return (
    <section
      id={id}
      className="rounded-[20px] border border-white/70 bg-[rgba(249,251,247,0.85)] p-4 shadow-[0_24px_80px_rgba(72,40,23,0.08)] backdrop-blur-xl md:p-6"
    >
      {children}
    </section>
  );
}

function SectionHeading({ kicker, title, note }) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(196,160,110,0.35)] bg-[rgba(196,160,110,0.08)] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-[#4d6858]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#c4a06e]" />
          {kicker}
        </span>
      </div>
      <h2 className="font-serif text-[clamp(1.9rem,3.8vw,3.2rem)] leading-[0.92] tracking-[-0.01em] text-[#1e2a22]">{title}</h2>
      {note ? <p className="mt-3 text-[0.8125rem] leading-relaxed text-[#354b3e]">{note}</p> : null}
    </div>
  );
}

function InfoCard({ title, text }) {
  return (
    <article className="rounded-2xl border border-[rgba(53,75,62,0.12)] bg-[#f7f9f6] p-6">
      <h3 className="mb-2 font-serif text-[clamp(1.5rem,2.6vw,2rem)] leading-[0.95]">{title}</h3>
      <p className="text-sm leading-6 text-[#354b3e]">{text}</p>
    </article>
  );
}


function Field({ label, children }) {
  return (
    <label className="grid gap-2 text-sm text-[#354b3e]">
      <span>{label}</span>
      {children}
    </label>
  );
}

const LogisticsSection = memo(function LogisticsSection({ t }) {
  const [openQuestion, setOpenQuestion] = useState("0-0");

  return (
    <SectionCard id="logistics">
      <SectionHeading kicker={t.logistics.kicker} title={t.logistics.title} note={t.logistics.note} />
      <div className="grid gap-6">
        {t.logisticsSections.map((section, sectionIndex) => (
          <div key={section.title} className="grid gap-2">
            <div className="flex items-center gap-3 px-1 pb-1">
              <div className="h-px flex-1 bg-[rgba(53,75,62,0.1)]" />
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#4a6355]">
                {section.title}
              </h3>
              <div className="h-px flex-1 bg-[rgba(53,75,62,0.1)]" />
            </div>
            {section.items.map((card, itemIndex) => {
              const questionId = `${sectionIndex}-${itemIndex}`;
              const isOpen = openQuestion === questionId;
              return (
                <article key={card.title} className="overflow-hidden rounded-2xl border border-[rgba(53,75,62,0.12)] bg-[#f7f9f6]">
                  <button
                    type="button"
                    onClick={() => setOpenQuestion(isOpen ? "" : questionId)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-[rgba(53,75,62,0.03)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgba(196,160,110,0.65)]"
                  >
                    <span className="font-serif text-[clamp(1.05rem,1.8vw,1.3rem)] leading-[1.2] text-[#1e2a22]">{card.title}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="shrink-0 text-[#4d6858]"
                    >
                      <LuChevronDown size={16} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className="border-t border-[rgba(53,75,62,0.12)] px-5 pb-5 pt-4">
                          <p className="whitespace-pre-line text-sm leading-6 text-[#354b3e]">{card.text}</p>
                          {card.links.length ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {card.links.map(([label, href]) => (
                                <a
                                  key={href}
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(74,99,85,0.16)] bg-white/80 px-4 py-1.5 text-sm font-semibold text-[#4a6355] transition hover:border-[rgba(74,99,85,0.35)] hover:bg-white"
                                >
                                  <LuArrowUpRight size={12} />
                                  {label}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              );
            })}
          </div>
        ))}
      </div>
    </SectionCard>
  );
});

function StickyBar({ t }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.querySelector("header");
    const rsvp = document.getElementById("rsvp");
    if (!hero || !rsvp) return;

    let heroGone = false;
    let rsvpVisible = false;

    const update = () => setShow(heroGone && !rsvpVisible);

    const heroObs = new IntersectionObserver(
      ([e]) => { heroGone = !e.isIntersecting; update(); },
      { threshold: 0 }
    );
    const rsvpObs = new IntersectionObserver(
      ([e]) => { rsvpVisible = e.isIntersecting; update(); },
      { threshold: 0.15 }
    );

    heroObs.observe(hero);
    rsvpObs.observe(rsvp);
    return () => { heroObs.disconnect(); rsvpObs.disconnect(); };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-50 flex gap-2 rounded-full border border-white/70 bg-[rgba(249,251,247,0.92)] p-1.5 shadow-[0_8px_40px_rgba(72,40,23,0.22)] backdrop-blur-xl md:left-1/2 md:right-auto md:w-auto md:-translate-x-1/2"
        >
          <a href="#menu" className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[rgba(53,75,62,0.12)] px-4 py-2.5 text-sm font-semibold text-[#4a6355] transition hover:bg-[rgba(53,75,62,0.06)]">
            <LuUtensils size={13} /> <span className="hidden whitespace-nowrap sm:inline">{t.menu.kicker}</span>
          </a>
          <a href="#rsvp" className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#4a6355] to-[#4d6858] px-4 py-2.5 text-sm font-bold text-white">
            <LuMail size={13} /> <span className="whitespace-nowrap">{t.hero.primary}</span>
          </a>
          <a href="#logistics" className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[rgba(53,75,62,0.12)] px-4 py-2.5 text-sm font-semibold text-[#4a6355] transition hover:bg-[rgba(53,75,62,0.06)]">
            <LuMap size={13} /> <span className="hidden whitespace-nowrap sm:inline">{t.logistics.kicker}</span>
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
