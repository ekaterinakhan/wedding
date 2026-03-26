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

function Badge({ value, className = "" }) {
  if (!value) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {value}
    </span>
  );
}

function MenuBadge({ choice }) {
  if (!choice) return <span className="text-gray-400 text-xs">—</span>;
  const label = MENU_LABELS[choice] || choice;
  const color = MENU_COLORS[choice] || "bg-gray-100 text-gray-700";
  return <Badge value={label} className={color} />;
}

function AttendanceBadge({ value }) {
  if (!value || value === "no") {
    return <Badge value="No" className="bg-red-100 text-red-700" />;
  }
  return <Badge value="Yes" className="bg-green-100 text-green-800" />;
}

function formatDate(raw) {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function parseKids(raw) {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
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
      if (res.ok) {
        onLogin();
      } else {
        setError(json.error || "Invalid password.");
      }
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
  const [rsvps, setRsvps] = useState([]);
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
      .then(data => setRsvps(Array.isArray(data) ? data : []))
      .catch(() => setRsvps([]))
      .finally(() => setDataLoading(false));
  }, [authenticated]);

  async function handleLogout() {
    await fetch("/api/private/logout", { method: "POST", credentials: "include" });
    setAuthenticated(false);
    setRsvps([]);
  }

  const stats = useMemo(() => {
    const attending = rsvps.filter(r => r.attendance === "yes" || r.attendance === "yes-all" || r.attendance?.startsWith("yes"));
    const notAttending = rsvps.filter(r => r.attendance === "no");
    const withPlusOne = attending.filter(r => r.plus_one === "yes");
    const kids = rsvps.flatMap(r => parseKids(r.kids));
    const needsTransfer = attending.filter(r => r.transfer === "yes");

    const menuCounts = {};
    for (const r of attending) {
      if (r.menu) menuCounts[r.menu] = (menuCounts[r.menu] || 0) + 1;
      if (r.plus_one === "yes" && r.plus_one_menu) {
        menuCounts[r.plus_one_menu] = (menuCounts[r.plus_one_menu] || 0) + 1;
      }
    }

    const totalPeople = attending.length + withPlusOne.length + kids.length;

    return { attending, notAttending, withPlusOne, kids, needsTransfer, menuCounts, totalPeople };
  }, [rsvps]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-mist-600 text-sm">Loading…</span>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginForm onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
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
                    tab === t.id
                      ? "bg-sage-700 text-white"
                      : "text-mist-600 hover:bg-sage-500/10"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#/"
              className="text-xs text-mist-600 hover:text-ink-900 transition-colors hidden sm:block"
            >
              ← Back to site
            </a>
            <button
              onClick={handleLogout}
              className="text-xs text-mist-600 hover:text-ink-900 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {dataLoading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-mist-600 text-sm">Loading data…</span>
          </div>
        ) : (
          <>
            {tab === "guests" && <GuestsTab rsvps={rsvps} stats={stats} />}
            {tab === "menu" && <MenuTab rsvps={rsvps} stats={stats} />}
            {tab === "transfer" && <TransferTab rsvps={rsvps} stats={stats} />}
          </>
        )}
      </main>
    </div>
  );
}

function GuestsTab({ rsvps, stats }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total RSVPs" value={rsvps.length} />
        <StatCard label="Attending" value={stats.attending.length} sub={`+${stats.withPlusOne.length} plus-ones · ${stats.kids.length} kids`} />
        <StatCard label="Not attending" value={stats.notAttending.length} />
        <StatCard label="Total people" value={stats.totalPeople} />
      </div>

      {/* Table */}
      <div className="bg-white/70 border border-sage-200/40 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-sage-200/40">
                {["Name", "Email", "Attending", "Events", "+1 Name", "Kids", "Dietary / Notes", "Submitted"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-widest text-mist-600 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rsvps.map((r, i) => {
                const kids = parseKids(r.kids);
                return (
                  <tr key={r.id} className={`border-b border-sage-200/20 ${i % 2 === 0 ? "" : "bg-cream-50/40"}`}>
                    <td className="px-4 py-3 font-medium text-ink-900 whitespace-nowrap">{r.name}</td>
                    <td className="px-4 py-3 text-mist-600 text-xs">{r.email || "—"}</td>
                    <td className="px-4 py-3"><AttendanceBadge value={r.attendance} /></td>
                    <td className="px-4 py-3 text-xs text-mist-600">{r.events || "—"}</td>
                    <td className="px-4 py-3 text-xs text-ink-900">{r.plus_one === "yes" ? (r.plus_one_name || "yes (unnamed)") : "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {kids.length === 0 ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {kids.map((k, j) => (
                            <span key={j} className="text-ink-900">{k.name || `Child ${j + 1}`}{k.dietary ? <span className="text-mist-600"> ({k.dietary})</span> : ""}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-mist-600 max-w-[200px]">
                      {[r.dietary, r.notes].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-mist-600 whitespace-nowrap">
                      {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MenuTab({ rsvps, stats }) {
  const attending = rsvps.filter(r => r.attendance !== "no");
  const { menuCounts } = stats;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(MENU_LABELS).map(([key, label]) => (
          <StatCard key={key} label={label} value={menuCounts[key] || 0} />
        ))}
      </div>

      {/* Table */}
      <div className="bg-white/70 border border-sage-200/40 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-sage-200/40">
                {["Name", "Menu choice", "+1 Name", "+1 Menu", "Dietary restrictions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-widest text-mist-600 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attending.map((r, i) => (
                <tr key={r.id} className={`border-b border-sage-200/20 ${i % 2 === 0 ? "" : "bg-cream-50/40"}`}>
                  <td className="px-4 py-3 font-medium text-ink-900">{r.name}</td>
                  <td className="px-4 py-3"><MenuBadge choice={r.menu} /></td>
                  <td className="px-4 py-3 text-xs text-ink-900">{r.plus_one === "yes" ? (r.plus_one_name || "Yes (unnamed)") : "—"}</td>
                  <td className="px-4 py-3">{r.plus_one === "yes" ? <MenuBadge choice={r.plus_one_menu} /> : <span className="text-gray-400 text-xs">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-mist-600">{r.dietary || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TransferTab({ rsvps, stats }) {
  const attending = rsvps.filter(r => r.attendance !== "no");
  const needsTransfer = attending.filter(r => r.transfer === "yes");
  const noTransfer = attending.filter(r => r.transfer === "no");
  const unknown = attending.filter(r => !r.transfer);

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Needs transfer" value={needsTransfer.length} sub={`${needsTransfer.reduce((s, r) => s + (parseInt(r.transfer_party_size) || 1), 0)} people total`} />
        <StatCard label="No transfer needed" value={noTransfer.length} />
        <StatCard label="Not answered" value={unknown.length} />
      </div>

      {/* Table */}
      <div className="bg-white/70 border border-sage-200/40 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-sage-200/40">
                {["Name", "Transfer", "Arrival date/time", "Arrival location", "Return date/time", "Return location", "Party size"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-widest text-mist-600 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attending.map((r, i) => (
                <tr key={r.id} className={`border-b border-sage-200/20 ${i % 2 === 0 ? "" : "bg-cream-50/40"}`}>
                  <td className="px-4 py-3 font-medium text-ink-900 whitespace-nowrap">{r.name}</td>
                  <td className="px-4 py-3">
                    {r.transfer === "yes"
                      ? <Badge value="Yes" className="bg-green-100 text-green-800" />
                      : r.transfer === "no"
                      ? <Badge value="No" className="bg-gray-100 text-gray-600" />
                      : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-900">{r.arrival_datetime || "—"}</td>
                  <td className="px-4 py-3 text-xs text-ink-900">{r.arrival_location || "—"}</td>
                  <td className="px-4 py-3 text-xs text-ink-900">{r.return_datetime || "—"}</td>
                  <td className="px-4 py-3 text-xs text-ink-900">{r.return_location || "—"}</td>
                  <td className="px-4 py-3 text-xs text-center">{r.transfer_party_size || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
