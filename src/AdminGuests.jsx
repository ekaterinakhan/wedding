import { useEffect, useState, useMemo } from "react";

const MENU_LABELS = { meat: "Meat", fish: "Fish", poultry: "Poultry", vegetarian: "Vegetarian", vegan: "Vegan" };
const MENU_EMOJI = { meat: "🥩", fish: "🐟", poultry: "🍗", vegetarian: "🥬", vegan: "🌱" };
const MENU_COLORS = {
  meat: "bg-red-50 text-red-700 border-red-200",
  fish: "bg-blue-50 text-blue-700 border-blue-200",
  poultry: "bg-amber-50 text-amber-700 border-amber-200",
  vegetarian: "bg-green-50 text-green-700 border-green-200",
  vegan: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function isAttending(p) { return p.guest_type !== "primary" || p.attendance !== "no"; }

function groupFamilies(people) {
  const map = new Map();
  for (const p of people) {
    const key = p.rsvp_id ?? p.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }
  return [...map.values()].map(members => {
    const primary = members.find(m => m.guest_type === "primary") || members[0];
    const plusOne = members.find(m => m.guest_type === "plus_one");
    const children = members.filter(m => m.guest_type === "child");
    return { primary, plusOne, children, members, attending: isAttending(primary) };
  });
}

/* ── Shared UI ── */

function Badge({ children, className = "" }) {
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${className}`}>{children}</span>;
}

function TypeBadge({ type }) {
  const map = {
    primary: ["Guest", "bg-sage-500/10 text-sage-700 border-sage-500/20"],
    plus_one: ["+1", "bg-violet-50 text-violet-700 border-violet-200"],
    child: ["Child", "bg-amber-50 text-amber-700 border-amber-200"],
  };
  const [label, cls] = map[type] || [type, "bg-gray-100 text-gray-600 border-gray-200"];
  return <Badge className={cls}>{label}</Badge>;
}

function MenuBadge({ choice }) {
  if (!choice) return <span className="text-gray-300 text-xs">No choice</span>;
  if (choice === "kids") return <Badge className="bg-amber-50 text-amber-600 border-amber-200">Kids menu</Badge>;
  return <Badge className={MENU_COLORS[choice] || "bg-gray-100 text-gray-700 border-gray-200"}>{MENU_EMOJI[choice] || ""} {MENU_LABELS[choice] || choice}</Badge>;
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`rounded-2xl px-5 py-4 flex flex-col gap-1 border ${accent || "bg-white/80 border-sage-200/40"}`}>
      <span className="text-[11px] uppercase tracking-widest text-mist-600 font-semibold">{label}</span>
      <span className="text-3xl font-serif text-ink-900 leading-none">{value}</span>
      {sub && <span className="text-xs text-mist-600 mt-0.5">{sub}</span>}
    </div>
  );
}

function SectionHeader({ title, count, children }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <h2 className="font-serif text-2xl text-ink-900">
        {title} {count != null && <span className="text-mist-600 text-lg font-normal">({count})</span>}
      </h2>
      {children}
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="text-center py-16 text-mist-600 text-sm">{text}</div>;
}

/* ── Login ── */

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
        method: "POST", credentials: "include",
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
    <div className="min-h-screen flex items-center justify-center px-4 bg-cream-100">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-4xl text-ink-900 text-center mb-1">Wedding Admin</h1>
        <p className="text-sm text-mist-600 text-center mb-8">Guest management &amp; planning</p>
        <form onSubmit={handleSubmit} className="bg-white border border-sage-200/50 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-widest text-mist-600 font-semibold">Password</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="border border-sage-200/60 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage-500/30 bg-[#fafbf9]"
              autoFocus required />
          </label>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="bg-sage-700 hover:bg-sage-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Tabs ── */

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "guests", label: "Families" },
  { id: "menu", label: "Menu" },
  { id: "transport", label: "Transport" },
];

/* ── Main ── */

export default function AdminGuests() {
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [people, setPeople] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    fetch("/api/private/session", { credentials: "include" })
      .then(r => r.json())
      .then(json => setAuthenticated(Boolean(json.authenticated)))
      .catch(() => setAuthenticated(false))
      .finally(() => setSessionLoading(false));
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    setDataLoading(true);
    fetch("/api/private/rsvps", { credentials: "include" })
      .then(r => r.json())
      .then(data => setPeople(Array.isArray(data) ? data : []))
      .catch(() => setPeople([]))
      .finally(() => setDataLoading(false));
  }, [authenticated]);

  async function handleLogout() {
    await fetch("/api/private/logout", { method: "POST", credentials: "include" });
    setAuthenticated(false);
    setPeople([]);
  }

  const families = useMemo(() => groupFamilies(people), [people]);
  const stats = useMemo(() => {
    const attending = people.filter(isAttending);
    const notAttending = people.filter(p => p.guest_type === "primary" && p.attendance === "no");
    const primaries = attending.filter(p => p.guest_type === "primary");
    const plusOnes = attending.filter(p => p.guest_type === "plus_one");
    const kids = attending.filter(p => p.guest_type === "child");
    const menuCounts = {};
    for (const p of attending) { if (p.menu && p.menu !== "kids") menuCounts[p.menu] = (menuCounts[p.menu] || 0) + 1; }
    const dietaryList = attending.filter(p => p.dietary?.trim()).map(p => ({ name: p.name, type: p.guest_type, dietary: p.dietary.trim() }));
    const needsTransfer = primaries.filter(p => p.transfer === "yes");
    const transferPeople = needsTransfer.reduce((s, p) => s + (parseInt(p.transfer_party_size) || 1), 0);
    const noTransfer = primaries.filter(p => p.transfer === "no");
    const notAnsweredTransfer = primaries.filter(p => !p.transfer);
    return { attending, notAttending, primaries, plusOnes, kids, menuCounts, dietaryList, needsTransfer, transferPeople, noTransfer, notAnsweredTransfer };
  }, [people]);

  if (sessionLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-cream-100"><span className="text-mist-600 text-sm">Loading...</span></div>;
  }
  if (!authenticated) return <LoginForm onLogin={() => setAuthenticated(true)} />;

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Header */}
      <header className="border-b border-sage-500/10 bg-white/80 backdrop-blur-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h1 className="font-serif text-xl text-ink-900 whitespace-nowrap">Wedding Admin</h1>
            <nav className="flex gap-0.5">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    tab === t.id ? "bg-sage-700 text-white shadow-sm" : "text-mist-600 hover:bg-sage-500/10 hover:text-ink-900"
                  }`}>
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="text-xs text-mist-600 hover:text-ink-900 transition-colors hidden sm:block">Back to site</a>
            <button onClick={handleLogout} className="text-xs text-mist-600 hover:text-ink-900 transition-colors">Sign out</button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {dataLoading ? (
          <div className="flex items-center justify-center py-20"><span className="text-mist-600 text-sm">Loading...</span></div>
        ) : (
          <>
            {tab === "overview" && <OverviewTab stats={stats} families={families} />}
            {tab === "guests" && <FamiliesTab families={families} />}
            {tab === "menu" && <MenuTab stats={stats} people={people} />}
            {tab === "transport" && <TransportTab stats={stats} />}
          </>
        )}
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   OVERVIEW TAB
   ═══════════════════════════════════════════════════ */

function OverviewTab({ stats, families }) {
  const attendingFamilies = families.filter(f => f.attending);
  const totalAdultMenus = Object.values(stats.menuCounts).reduce((a, b) => a + b, 0);
  const kidsCount = stats.kids.length;

  return (
    <div className="flex flex-col gap-8">
      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Total attending" value={stats.attending.length} accent="bg-sage-500/5 border-sage-500/20" />
        <StatCard label="Families" value={attendingFamilies.length} />
        <StatCard label="Guests" value={stats.primaries.length} />
        <StatCard label="Plus-ones" value={stats.plusOnes.length} />
        <StatCard label="Children" value={kidsCount} />
        <StatCard label="Declined" value={stats.notAttending.length} />
      </div>

      {/* Two-column detail: Menu summary + Dietary alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Menu summary */}
        <div className="bg-white border border-sage-200/40 rounded-2xl p-6">
          <h3 className="font-serif text-lg text-ink-900 mb-4">Menu breakdown</h3>
          <div className="flex flex-col gap-3">
            {Object.entries(MENU_LABELS).map(([key, label]) => {
              const count = stats.menuCounts[key] || 0;
              const pct = totalAdultMenus > 0 ? (count / totalAdultMenus) * 100 : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-6 text-center">{MENU_EMOJI[key]}</span>
                  <span className="text-sm text-ink-900 w-24">{label}</span>
                  <div className="flex-1 h-7 bg-gray-100 rounded-full overflow-hidden relative">
                    <div className={`h-full rounded-full transition-all duration-500 ${MENU_COLORS[key]?.split(" ")[0] || "bg-gray-300"}`}
                      style={{ width: `${Math.max(pct, 2)}%` }} />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-ink-900/70">{count}</span>
                  </div>
                </div>
              );
            })}
            {kidsCount > 0 && (
              <div className="flex items-center gap-3">
                <span className="w-6 text-center">👶</span>
                <span className="text-sm text-ink-900 w-24">Kids menu</span>
                <div className="flex-1 h-7 bg-gray-100 rounded-full overflow-hidden relative">
                  <div className="h-full rounded-full bg-amber-100" style={{ width: `${Math.max((kidsCount / (totalAdultMenus + kidsCount)) * 100, 2)}%` }} />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-ink-900/70">{kidsCount}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dietary alerts */}
        <div className="bg-white border border-sage-200/40 rounded-2xl p-6">
          <h3 className="font-serif text-lg text-ink-900 mb-4">
            Dietary restrictions & allergies
            {stats.dietaryList.length > 0 && <span className="text-mist-600 text-sm font-normal ml-2">({stats.dietaryList.length})</span>}
          </h3>
          {stats.dietaryList.length === 0 ? (
            <p className="text-sm text-mist-600">No dietary restrictions reported.</p>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto">
              {stats.dietaryList.map((d, i) => (
                <div key={i} className="flex items-start gap-3 bg-red-50/50 border border-red-100 rounded-xl px-3.5 py-2.5">
                  <span className="text-red-400 text-sm mt-0.5">&#9888;</span>
                  <div>
                    <span className="text-sm font-medium text-ink-900">{d.name}</span>
                    {d.type !== "primary" && <TypeBadge type={d.type} />}
                    <p className="text-xs text-red-700 mt-0.5">{d.dietary}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transport snapshot */}
      <div className="bg-white border border-sage-200/40 rounded-2xl p-6">
        <h3 className="font-serif text-lg text-ink-900 mb-4">Transport snapshot</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Need transfer" value={stats.needsTransfer.length} sub={`${stats.transferPeople} people total`} />
          <StatCard label="No transfer" value={stats.noTransfer.length} />
          <StatCard label="Not answered" value={stats.notAnsweredTransfer.length} accent={stats.notAnsweredTransfer.length > 0 ? "bg-amber-50 border-amber-200" : undefined} />
          <StatCard label="Total people" value={stats.transferPeople} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   FAMILIES TAB
   ═══════════════════════════════════════════════════ */

function FamilyCard({ family }) {
  const { primary, plusOne, children } = family;
  const allMembers = [primary, plusOne, ...children].filter(Boolean);
  const attending = family.attending;

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${attending ? "border-sage-200/50" : "border-gray-200/50 opacity-50"}`}>
      {/* Primary guest header */}
      <div className="px-5 py-4 border-b border-sage-200/20 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-ink-900 text-base">{primary.name}</h3>
            {!attending && <Badge className="bg-red-50 text-red-600 border-red-200">Declined</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-mist-600 flex-wrap">
            {primary.email && <span>{primary.email}</span>}
            {primary.phone && <><span className="text-mist-600/30">|</span><span>{primary.phone}</span></>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-mist-600">
            {primary.submitted_at ? new Date(primary.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
          </div>
          {attending && <div className="text-xs text-mist-600 mt-0.5">{primary.events || "Events not specified"}</div>}
        </div>
      </div>

      {attending && (
        <div className="px-5 py-3">
          {/* Members table */}
          <table className="w-full text-sm">
            <tbody>
              {allMembers.map(p => (
                <tr key={p.id} className="border-b border-sage-200/10 last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-ink-900 whitespace-nowrap">
                    {p.name}
                  </td>
                  <td className="py-2.5 pr-3">
                    <TypeBadge type={p.guest_type} />
                  </td>
                  <td className="py-2.5 pr-3">
                    <MenuBadge choice={p.menu} />
                  </td>
                  <td className="py-2.5 text-xs text-mist-600">
                    {p.dietary ? <span className="text-red-600">{p.dietary}</span> : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Transfer info */}
          {primary.transfer && (
            <div className={`mt-3 rounded-xl px-3.5 py-2.5 text-xs ${primary.transfer === "yes" ? "bg-blue-50 border border-blue-100" : "bg-gray-50 border border-gray-100"}`}>
              {primary.transfer === "yes" ? (
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-blue-800">Transfer needed — {primary.transfer_party_size || 1} {(parseInt(primary.transfer_party_size) || 1) === 1 ? "person" : "people"}</span>
                  <div className="grid sm:grid-cols-2 gap-x-4 gap-y-0.5 text-blue-700">
                    {primary.arrival_datetime && <span>Arrives: {primary.arrival_datetime}</span>}
                    {primary.arrival_location && <span>At: {primary.arrival_location}</span>}
                    {primary.return_datetime && <span>Returns: {primary.return_datetime}</span>}
                    {primary.return_location && <span>From: {primary.return_location}</span>}
                  </div>
                </div>
              ) : (
                <span className="text-gray-500">No transfer needed</span>
              )}
            </div>
          )}

          {/* Notes */}
          {primary.notes && (
            <div className="mt-2 text-xs text-mist-600 italic bg-cream-50 rounded-lg px-3 py-2 border border-cream-100">
              {primary.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FamiliesTab({ families }) {
  const attending = families.filter(f => f.attending);
  const declined = families.filter(f => !f.attending);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Attending families" count={attending.length} />
      {attending.length === 0 ? <EmptyState text="No RSVPs yet." /> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {attending.map(f => <FamilyCard key={f.primary.id} family={f} />)}
        </div>
      )}

      {declined.length > 0 && (
        <>
          <SectionHeader title="Declined" count={declined.length} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {declined.map(f => <FamilyCard key={f.primary.id} family={f} />)}
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MENU TAB
   ═══════════════════════════════════════════════════ */

function MenuTab({ stats, people }) {
  const attending = people.filter(isAttending);
  const { menuCounts } = stats;
  const totalAdultMenus = Object.values(menuCounts).reduce((a, b) => a + b, 0);

  const byChoice = useMemo(() => {
    const groups = {};
    for (const p of attending) {
      if (!p.menu || p.menu === "kids") continue;
      if (!groups[p.menu]) groups[p.menu] = [];
      groups[p.menu].push(p);
    }
    return groups;
  }, [attending]);

  return (
    <div className="flex flex-col gap-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(MENU_LABELS).map(([key, label]) => (
          <StatCard key={key} label={`${MENU_EMOJI[key]} ${label}`} value={menuCounts[key] || 0}
            sub={totalAdultMenus > 0 ? `${Math.round(((menuCounts[key] || 0) / totalAdultMenus) * 100)}%` : undefined} />
        ))}
        <StatCard label="👶 Kids" value={stats.kids.length} />
      </div>

      {/* Per-choice guest lists */}
      {Object.entries(MENU_LABELS).map(([key, label]) => {
        const group = byChoice[key] || [];
        if (group.length === 0) return null;
        return (
          <div key={key} className="bg-white border border-sage-200/40 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-sage-200/20 flex items-center gap-2">
              <span>{MENU_EMOJI[key]}</span>
              <h3 className="font-semibold text-ink-900">{label}</h3>
              <span className="text-mist-600 text-sm">({group.length})</span>
            </div>
            <div className="divide-y divide-sage-200/10">
              {group.map(p => (
                <div key={p.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink-900">{p.name}</span>
                    <TypeBadge type={p.guest_type} />
                  </div>
                  {p.dietary && <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">{p.dietary}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Dietary detail section */}
      {stats.dietaryList.length > 0 && (
        <div className="bg-white border border-red-100 rounded-2xl p-6">
          <h3 className="font-serif text-lg text-ink-900 mb-4">All dietary restrictions & allergies</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {stats.dietaryList.map((d, i) => (
              <div key={i} className="flex items-start gap-3 bg-red-50/40 rounded-xl px-4 py-3 border border-red-100/60">
                <span className="text-red-400 mt-0.5">&#9888;</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink-900">{d.name}</span>
                    <TypeBadge type={d.type} />
                  </div>
                  <p className="text-sm text-red-700 mt-0.5">{d.dietary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TRANSPORT TAB
   ═══════════════════════════════════════════════════ */

function TransportTab({ stats }) {
  const { needsTransfer, noTransfer, notAnsweredTransfer, transferPeople } = stats;

  return (
    <div className="flex flex-col gap-8">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Need transfer" value={needsTransfer.length} sub={`${transferPeople} people total`} accent="bg-blue-50 border-blue-200" />
        <StatCard label="Total people" value={transferPeople} />
        <StatCard label="No transfer" value={noTransfer.length} />
        <StatCard label="Not answered" value={notAnsweredTransfer.length}
          accent={notAnsweredTransfer.length > 0 ? "bg-amber-50 border-amber-200" : undefined} />
      </div>

      {/* Transfer details */}
      {needsTransfer.length > 0 && (
        <div className="bg-white border border-sage-200/40 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-sage-200/20">
            <h3 className="font-semibold text-ink-900">Transfer details</h3>
          </div>
          <div className="divide-y divide-sage-200/10">
            {needsTransfer.map(p => (
              <div key={p.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="font-medium text-ink-900">{p.name}</span>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                    {p.transfer_party_size || 1} {(parseInt(p.transfer_party_size) || 1) === 1 ? "person" : "people"}
                  </Badge>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-green-50/50 border border-green-100 rounded-xl px-3.5 py-2.5">
                    <div className="text-[11px] uppercase tracking-widest text-green-700 font-semibold mb-1">Arrival</div>
                    <div className="text-ink-900">{p.arrival_datetime || <span className="text-mist-600">Not specified</span>}</div>
                    <div className="text-mist-600 text-xs mt-0.5">{p.arrival_location || "Location not specified"}</div>
                  </div>
                  <div className="bg-orange-50/50 border border-orange-100 rounded-xl px-3.5 py-2.5">
                    <div className="text-[11px] uppercase tracking-widest text-orange-700 font-semibold mb-1">Return</div>
                    <div className="text-ink-900">{p.return_datetime || <span className="text-mist-600">Not specified</span>}</div>
                    <div className="text-mist-600 text-xs mt-0.5">{p.return_location || "Location not specified"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No transfer / not answered lists */}
      <div className="grid sm:grid-cols-2 gap-4">
        {noTransfer.length > 0 && (
          <div className="bg-white border border-sage-200/40 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-ink-900 mb-3">No transfer needed ({noTransfer.length})</h3>
            <div className="flex flex-wrap gap-2">
              {noTransfer.map(p => (
                <span key={p.id} className="text-xs bg-gray-50 text-mist-600 border border-gray-200 px-2.5 py-1 rounded-full">{p.name}</span>
              ))}
            </div>
          </div>
        )}
        {notAnsweredTransfer.length > 0 && (
          <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-ink-900 mb-3">Not answered ({notAnsweredTransfer.length})</h3>
            <div className="flex flex-wrap gap-2">
              {notAnsweredTransfer.map(p => (
                <span key={p.id} className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full">{p.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
