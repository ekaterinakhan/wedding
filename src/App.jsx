import { useState, useEffect, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cursors } from "./components/Cursors";
import { MenuPicker } from "./components/MenuPicker";
import {
  LuMapPin, LuArrowUpRight, LuChevronDown,
  LuHeart, LuCar, LuWine, LuUtensils, LuFlag,
  LuMail, LuMap, LuCalendarDays, LuSunrise,
} from "react-icons/lu";

import en from "./i18n/en.json";
import fr from "./i18n/fr.json";
import OWN_PHOTOS from "./photos.json";

const content = { en, fr };

const SHUFFLED_PHOTOS = [...OWN_PHOTOS].sort(() => Math.random() - 0.5);

function getPhoto(i) {
  return SHUFFLED_PHOTOS[i % SHUFFLED_PHOTOS.length];
}

const SLOT = [
  { rotate: 2.5, x: 0, y: 0 },
  { rotate: -3.5, x: -6, y: 9 },
  { rotate: 4.5, x: 8, y: 16 },
];
const STACK = SLOT.length;

function HeroPhotoStack() {
  const [top, setTop] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTop(i => i + 1), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    [1, 2, 3].forEach(off => {
      const { src } = getPhoto(top + off);
      if (!src.startsWith("/")) { const img = new window.Image(); img.src = src; }
    });
  }, [top]);

  const cards = Array.from({ length: STACK }, (_, slot) => ({ photoIdx: top + slot, slot }));

  return (
    <div className="flex items-center justify-center lg:justify-end">
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
                <div style={{ margin: 10, marginBottom: 0, height: 272, overflow: "hidden", borderRadius: 10 }}>
                  <img src={photo.src} alt={photo.alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
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
    fish: { color: "text-[#6a7f7a]", bg: "bg-[rgba(106,127,122,0.10)]" },
    vegetarian: { color: "text-[#6c8a5d]", bg: "bg-[rgba(108,138,93,0.11)]" },
    poultry: { color: "text-[#9b7658]", bg: "bg-[rgba(155,118,88,0.10)]" },
    dessert: { color: "text-[#b08a4a]", bg: "bg-[rgba(196,160,110,0.12)]" }
  };

  if (sectionId === "dessert") return { glyph: DessertGlyph, ...tone.dessert };
  if (optionId.includes("fish") || optionId.includes("trout")) return { glyph: FishGlyph, ...tone.fish };
  if (optionId.includes("chicken")) return { glyph: PoultryGlyph, ...tone.poultry };
  return { glyph: LeafGlyph, ...tone.vegetarian };
}

function App() {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("wedding_lang") || null; } catch { return null; }
  });
  const t = content[lang] ?? content["en"];

  useEffect(() => {
    if (lang) return;
    fetch("/api/country")
      .then((r) => r.json())
      .then((data) => setLang(data.country === "FR" ? "fr" : "en"))
      .catch(() => setLang("en"));
  }, [lang]);

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
                onClick={() => { setLang(code); try { localStorage.setItem("wedding_lang", code); } catch { /* empty */ } }}
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
              <a className="rounded-full bg-gradient-to-br from-[#4a6355] to-[#4d6858] px-6 py-3.5 font-bold text-white" href="#menu-picker">
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
          <SectionHeading kicker={t.menu.kicker} title={t.menu.title} note={t.menu.note} />
          <div className="grid gap-5">
            <div className="rounded-[26px] border border-[rgba(53,75,62,0.12)] bg-[linear-gradient(180deg,rgba(255,252,246,0.72),rgba(247,249,246,0.92))] p-5 md:p-6">
              <p className="text-sm leading-6 text-[#354b3e]">{t.menu.intro}</p>
              <div className="mt-5 grid gap-6 md:grid-cols-3 md:gap-0">
                {t.menu.sections.map((section, index) => (
                  <div
                    key={section.id}
                    className={`grid gap-3 ${index > 0 ? "md:border-l md:border-[rgba(53,75,62,0.1)] md:pl-6" : ""} ${index < t.menu.sections.length - 1 ? "md:pr-6" : ""}`}
                  >
                    <h3 className="font-serif text-[1.45rem] leading-none text-[#1e2a22]">{section.title}</h3>
                    <div className="grid gap-1.5">
                      {section.options.map((option) => {
                        const visual = getMenuOptionVisual(section.id, option.id);
                        const Glyph = visual.glyph;
                        return (
                          <div key={option.id} className="flex items-start gap-3 border-b border-[rgba(53,75,62,0.08)] py-2.5 text-sm leading-6 text-[#354b3e] last:border-b-0 last:pb-0">
                            <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${visual.bg} ${visual.color}`}>
                              <Glyph className="h-4 w-4" />
                            </span>
                            <span>{option.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard id="menu-picker">
          <SectionHeading kicker={t.menuPicker.kicker} title={t.menuPicker.title} note={t.menuPicker.note} />
          <MenuPicker t={t} sections={t.menu.sections} />
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
    const picker = document.getElementById("menu-picker");
    if (!hero || !picker) return;

    let heroGone = false;
    let pickerVisible = false;

    const update = () => setShow(heroGone && !pickerVisible);

    const heroObs = new IntersectionObserver(
      ([e]) => { heroGone = !e.isIntersecting; update(); },
      { threshold: 0 }
    );
    const pickerObs = new IntersectionObserver(
      ([e]) => { pickerVisible = e.isIntersecting; update(); },
      { threshold: 0.15 }
    );

    heroObs.observe(hero);
    pickerObs.observe(picker);
    return () => { heroObs.disconnect(); pickerObs.disconnect(); };
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
          <a href="#menu-picker" className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#4a6355] to-[#4d6858] px-4 py-2.5 text-sm font-bold text-white">
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
