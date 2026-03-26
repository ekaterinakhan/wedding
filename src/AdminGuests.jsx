import { useEffect, useState, useMemo } from "react";

const MENU_LABELS = {
  meat: "Meat",
  fish: "Fish",
  poultry: "Poultry",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
};

const MENU_COLORS = {
  meat: "bg-red-100 text-red-800",
  fish: "bg-blue-100 text-blue-800",
  poultry: "bg-amber-100 text-amber-800",
  vegetarian: "bg-green-100 text-green-800",
  vegan: "bg-emerald-100 text-emerald-800",
};

function isAttending(person) {
  return person.guest_type !== "primary" || person.attendance !== "no";
}

function Badge({ value, className = "" }) {
  if (!value) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {value}
    </span>
  );
}

function TypeBadge({ type }) {
  const map = {
    primary: ["Guest", "bg-sage-500/10 text-sage-700"],
    plus_one: ["+1", "bg-mist-600/10 text-mist-600"],
    child: ["Child", "bg-amber-100 text-amber-700"],
  };
  const [label, cls] = map[type] || [type, "bg-gray-100 text-gray-600"];
  return <Badge value={label} className={cls} />;
}

function MenuBadge({ choice }) {
  if (!choice) return <span className="text-gray-300 text-xs">—</span>;
  if (choice === "kids") return <Badge value="Kids menu" className="bg-amber-50 text-amber-600 border border-amber-200" />;
  return <Badge value={MENU_LABELS[choice] || choice} className={MENU_COLORS[choice] || "bg-gray-100 text-gray-700"} />;
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white/70 border border-sage-200/40 rounded-2xl px-5 py-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-widest text-mist-600 font-medium">{label}</span>
      <span className="text-3xl font-serif text-ink-900">{value}</span>
      {sub && <span className="text-xs text-mist-600">{sub}</span>}
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="px-4 py-3 text-left text-xs uppercase tracking-widest text-mist-600 font-medium whitespace-nowrap">
      {children}
    </th>
  );
}

/** Alternating shade per party (rsvp_id group) */
function usePartyShades(people) {
  return useMemo(() => {
    const seen = new Map();
    let counter = 0;
    for (const p of people) {
      const key = p.rsvp_id ?? p.id;
      if (!seen.has(key)) seen.set(key, counter++);
    }
    return (rsvpId) => (seen.get(rsvpId ?? 0) ?? 0) % 2 === 0 ? "" : "bg-cream-50/50";
  }, [people]);
}

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
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-3xl text-ink-900 text-center mb-2">Admin</h1>
        <p className="text-sm text-mist-600 text-center mb-8">Guest list &amp; planning</p>
        <form onSubmit={handleSubmit} className="bg-white/80 border border-sage-200/40 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-widest text-mist-600 font-medium">Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="border border-sage-200/60 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sage-500/30 bg-cream-50"
              autoFocus
              required
            />
          </label>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-sage-700 hover:bg-sage-500 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

const TABS = [
  { id: "guests", label: "Guests" },
  { id: "menu", label: "Menu" },
  { id: "transfer", label: "Transfer" },
];

export default function AdminGuests() {
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [people, setPeople] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [tab, setTab] = useState("guests");

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

  const stats = useMemo(() => {
    const attending = people.filter(isAttending);
    const notAttending = people.filter(p => p.guest_type === "primary" && p.attendance === "no");
    const menuCounts = {};
    for (const p of attending) {
      if (p.menu && p.menu !== "kids") {
        menuCounts[p.menu] = (menuCounts[p.menu] || 0) + 1;
      }
    }
    // Transfer info lives on primary guest rows
    const primaryAttending = attending.filter(p => p.guest_type === "primary");
    const needsTransfer = primaryAttending.filter(p => p.transfer === "yes");
    const transferPeople = needsTransfer.reduce((s, p) => s + (parseInt(p.transfer_party_size) || 1), 0);
    return { attending, notAttending, menuCounts, needsTransfer, transferPeople, primaryAttending };
  }, [people]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-mist-600 text-sm">Loading…</span>
      </div>
    );
  }

  if (!authenticated) return <LoginForm onLogin={() => setAuthenticated(true)} />;

  return (
    <div className="min-h-screen">
      <header className="border-b border-sage-500/10 bg-cream-50/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h1 className="font-serif text-xl text-ink-900">Admin</h1>
            <nav className="flex gap-1">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    tab === t.id ? "bg-sage-700 text-white" : "text-mist-600 hover:bg-sage-500/10"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <a href="#/" className="text-xs text-mist-600 hover:text-ink-900 transition-colors hidden sm:block">
              ← Back to site
            </a>
            <button onClick={handleLogout} className="text-xs text-mist-600 hover:text-ink-900 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {dataLoading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-mist-600 text-sm">Loading…</span>
          </div>
        ) : (
          <>
            {tab === "guests" && <GuestsTab people={people} stats={stats} />}
            {tab === "menu" && <MenuTab people={people} stats={stats} />}
            {tab === "transfer" && <TransferTab stats={stats} />}
          </>
        )}
      </main>
    </div>
  );
}

function GuestsTab({ people, stats }) {
  const attending = people.filter(isAttending);
  const notAttending = people.filter(p => p.guest_type === "primary" && p.attendance === "no");
  const shade = usePartyShades(attending);
  const guests = stats.attending.filter(p => p.guest_type === "primary").length;
  const plusOnes = stats.attending.filter(p => p.guest_type === "plus_one").length;
  const kids = stats.attending.filter(p => p.guest_type === "child").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total attending" value={stats.attending.length} />
        <StatCard label="Guests" value={guests} />
        <StatCard label="Plus-ones" value={plusOnes} />
        <StatCard label="Kids" value={kids} />
      </div>

      <div className="bg-white/70 border border-sage-200/40 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="border-b border-sage-200/40">
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Menu</Th>
                <Th>Dietary / Notes</Th>
                <Th>Events</Th>
                <Th>Contact</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {attending.map(p => (
                <tr key={p.id} className={`border-b border-sage-200/20 ${shade(p.rsvp_id ?? p.id)}`}>
                  <td className="px-4 py-3 font-medium text-ink-900 whitespace-nowrap">{p.name}</td>
                  <td className="px-4 py-3"><TypeBadge type={p.guest_type} /></td>
                  <td className="px-4 py-3"><MenuBadge choice={p.menu} /></td>
                  <td className="px-4 py-3 text-xs text-mist-600 max-w-[180px]">
                    {[p.dietary, p.notes].filter(Boolean).join(" · ") || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-mist-600">{p.events || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-mist-600">{p.email || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-mist-600 whitespace-nowrap">
                    {p.submitted_at ? new Date(p.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                  </td>
                </tr>
              ))}

              {notAttending.length > 0 && (
                <>
                  <tr>
                    <td colSpan={7} className="px-4 py-2 text-xs uppercase tracking-widest text-mist-600/60 bg-cream-100/60 font-medium">
                      Not attending ({notAttending.length})
                    </td>
                  </tr>
                  {notAttending.map(p => (
                    <tr key={p.id} className="border-b border-sage-200/10 opacity-50">
                      <td className="px-4 py-2.5 font-medium text-ink-900">{p.name}</td>
                      <td className="px-4 py-2.5"><TypeBadge type={p.guest_type} /></td>
                      <td colSpan={5} className="px-4 py-2.5 text-xs text-mist-600">{p.email}</td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MenuTab({ people, stats }) {
  const attending = people.filter(isAttending);
  const { menuCounts } = stats;
  const shade = usePartyShades(attending);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(MENU_LABELS).map(([key, label]) => (
          <StatCard key={key} label={label} value={menuCounts[key] || 0} />
        ))}
      </div>

      <div className="bg-white/70 border border-sage-200/40 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-sage-200/40">
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Menu</Th>
                <Th>Dietary restrictions</Th>
              </tr>
            </thead>
            <tbody>
              {attending.map(p => (
                <tr key={p.id} className={`border-b border-sage-200/20 ${shade(p.rsvp_id ?? p.id)}`}>
                  <td className="px-4 py-3 font-medium text-ink-900">{p.name}</td>
                  <td className="px-4 py-3"><TypeBadge type={p.guest_type} /></td>
                  <td className="px-4 py-3"><MenuBadge choice={p.menu} /></td>
                  <td className="px-4 py-3 text-xs text-mist-600">{p.dietary || <span className="text-gray-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TransferTab({ stats }) {
  // Transfer info lives on primary guest rows only
  const { primaryAttending } = stats;
  const needsTransfer = primaryAttending.filter(p => p.transfer === "yes");
  const noTransfer = primaryAttending.filter(p => p.transfer === "no");
  const notAnswered = primaryAttending.filter(p => !p.transfer);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Need transfer" value={needsTransfer.length} sub={`${stats.transferPeople} people total`} />
        <StatCard label="No transfer" value={noTransfer.length} />
        <StatCard label="Not answered" value={notAnswered.length} />
      </div>

      <div className="bg-white/70 border border-sage-200/40 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-sage-200/40">
                <Th>Name</Th>
                <Th>Arrival</Th>
                <Th>Arrival location</Th>
                <Th>Return</Th>
                <Th>Return location</Th>
                <Th>Party size</Th>
              </tr>
            </thead>
            <tbody>
              {needsTransfer.map((p, i) => (
                <tr key={p.id} className={`border-b border-sage-200/20 ${i % 2 === 0 ? "" : "bg-cream-50/50"}`}>
                  <td className="px-4 py-3 font-medium text-ink-900 whitespace-nowrap">{p.name}</td>
                  <td className="px-4 py-3 text-xs text-ink-900">{p.arrival_datetime || "—"}</td>
                  <td className="px-4 py-3 text-xs text-ink-900">{p.arrival_location || "—"}</td>
                  <td className="px-4 py-3 text-xs text-ink-900">{p.return_datetime || "—"}</td>
                  <td className="px-4 py-3 text-xs text-ink-900">{p.return_location || "—"}</td>
                  <td className="px-4 py-3 text-xs text-center font-medium">{p.transfer_party_size || "—"}</td>
                </tr>
              ))}

              {noTransfer.length > 0 && (
                <>
                  <tr>
                    <td colSpan={6} className="px-4 py-2 text-xs uppercase tracking-widest text-mist-600/60 bg-cream-100/60 font-medium">
                      No transfer needed
                    </td>
                  </tr>
                  {noTransfer.map(p => (
                    <tr key={p.id} className="border-b border-sage-200/10 opacity-50">
                      <td className="px-4 py-2.5 text-ink-900">{p.name}</td>
                      <td colSpan={5} />
                    </tr>
                  ))}
                </>
              )}

              {notAnswered.length > 0 && (
                <>
                  <tr>
                    <td colSpan={6} className="px-4 py-2 text-xs uppercase tracking-widest text-mist-600/60 bg-cream-100/60 font-medium">
                      Not answered
                    </td>
                  </tr>
                  {notAnswered.map(p => (
                    <tr key={p.id} className="border-b border-sage-200/10 opacity-50">
                      <td className="px-4 py-2.5 text-ink-900">{p.name}</td>
                      <td colSpan={5} />
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
