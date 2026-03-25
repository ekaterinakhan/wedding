import { useEffect, useMemo, useState } from "react";

const preferredPriorities = ["Critical", "High", "Medium", "Low"];

function getBoardIdFromHash(hash) {
  const match = hash.match(/^#\/private\/([^/]+)/);
  return match ? match[1] : "";
}

function formatDisplayDate(value) {
  if (!value) {
    return "No date";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }

  return value;
}

export default function PrivateBoards() {
  const [boardId, setBoardId] = useState(() => getBoardIdFromHash(window.location.hash));
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [board, setBoard] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onHashChange = () => setBoardId(getBoardIdFromHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch("/api/private/session", {
          credentials: "include"
        });
        const json = await response.json();
        setAuthenticated(Boolean(json.authenticated));
      } catch {
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, []);

  useEffect(() => {
    if (!authenticated || !boardId) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/private/boards/${boardId}`, {
      credentials: "include"
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load board");
        }
        return response.json();
      })
      .then((json) => {
        if (!cancelled) {
          setBoard(json);
          setSelectedTaskId((current) => current || json.tasks[0]?.id || "");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load the private board.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated, boardId]);

  useEffect(() => {
    if (!board) {
      return;
    }

    const selected = board.tasks.find((task) => task.id === selectedTaskId) || board.tasks[0];
    if (selected) {
      setSelectedTaskId(selected.id);
      setDraft({
        status: selected.status || "",
        priority: selected.priority || "",
        responsible: selected.responsible || "",
        location: selected.location || "",
        deadline: selected.deadline || "",
        startDate: selected.startDate || "",
        endDate: selected.endDate || "",
        dependency: selected.dependency || "",
        category: selected.category || "",
        notes: selected.notes || ""
      });
    }
  }, [board, selectedTaskId]);

  const selectedTask = useMemo(
    () => board?.tasks.find((task) => task.id === selectedTaskId) || null,
    [board, selectedTaskId]
  );

  const groupedTasks = useMemo(() => {
    if (!board) {
      return [];
    }

    return board.statuses.map((status) => ({
      status,
      tasks: board.tasks.filter((task) => task.status === status)
    }));
  }, [board]);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/private/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      setError("Wrong password.");
      return;
    }

    setAuthenticated(true);
    setPassword("");
  }

  async function handleLogout() {
    await fetch("/api/private/logout", {
      method: "POST",
      credentials: "include"
    });
    setAuthenticated(false);
    setBoard(null);
    setSelectedTaskId("");
  }

  async function handleSave() {
    if (!selectedTask || !draft) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/private/boards/${boardId}/tasks/${selectedTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(draft)
      });

      if (!response.ok) {
        throw new Error("Save failed");
      }

      const updatedBoard = await response.json();
      setBoard(updatedBoard);
    } catch {
      setError("Could not save task changes.");
    } finally {
      setSaving(false);
    }
  }

  if (!boardId) {
    return <PrivateBoardLanding authenticated={authenticated} onLogout={handleLogout} />;
  }

  if (loading && !board) {
    return <CenteredCard title="Loading private board..." subtitle="Please wait a moment." />;
  }

  if (!authenticated) {
    return (
      <CenteredCard title="Private tracker" subtitle="Enter your passphrase to access your private planning boards.">
        <form className="grid gap-4" onSubmit={handleLogin}>
          <input
            className="w-full rounded-2xl border border-[rgba(93,52,38,0.16)] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[rgba(200,158,91,0.45)]"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Private passphrase"
          />
          <button className="rounded-full bg-gradient-to-br from-[#5d3426] to-[#8a5a44] px-6 py-3 font-bold text-white" type="submit">
            Unlock
          </button>
          {error ? <p className="text-sm text-[#8a5a44]">{error}</p> : null}
        </form>
      </CenteredCard>
    );
  }

  return (
    <div className="mx-auto my-4 w-[min(calc(100%-20px),1450px)] pb-12 sm:w-[min(calc(100%-32px),1450px)]">
      <section className="rounded-[28px] border border-white/70 bg-[rgba(255,250,243,0.82)] p-5 shadow-[0_24px_80px_rgba(72,40,23,0.12)] backdrop-blur-xl md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#5d3426]">Private tracker</p>
            <h1 className="mt-2 font-serif text-[clamp(2.7rem,6vw,5.2rem)] leading-[0.95] text-[#2a211c]">{board?.title}</h1>
            <p className="mt-4 max-w-[58ch] text-lg leading-8 text-[#6a5a51]">{board?.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              className={`rounded-full px-5 py-3 font-semibold ${
                boardId === "wedding" ? "bg-[#5d3426] text-white" : "border border-[rgba(71,46,31,0.12)] bg-white/70 text-[#5d3426]"
              }`}
              href="#/private/wedding"
            >
              Wedding board
            </a>
            <a
              className={`rounded-full px-5 py-3 font-semibold ${
                boardId === "admin" ? "bg-[#5d3426] text-white" : "border border-[rgba(71,46,31,0.12)] bg-white/70 text-[#5d3426]"
              }`}
              href="#/private/admin"
            >
              Admin board
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-[rgba(71,46,31,0.12)] bg-white/70 px-5 py-3 font-semibold text-[#5d3426]"
            >
              Lock
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <MetricCard label="Tasks" value={board?.tasks.length || 0} />
          <MetricCard label="Delayed" value={board?.tasks.filter((task) => task.delayDays > 0).length || 0} />
          <MetricCard label="Done" value={board?.tasks.filter((task) => task.status === "Done").length || 0} />
          <MetricCard
            label="High priority"
            value={board?.tasks.filter((task) => ["Critical", "High"].includes(task.priority)).length || 0}
          />
        </div>
      </section>

      <section className="mt-6">
        <div className="overflow-x-auto rounded-[24px] border border-white/70 bg-[rgba(255,250,243,0.74)] p-4 shadow-[0_24px_80px_rgba(72,40,23,0.12)] backdrop-blur-xl">
          <div className="grid min-w-[1100px] grid-cols-[repeat(auto-fit,minmax(290px,1fr))] gap-4">
            {groupedTasks.map((column) => (
              <div key={column.status} className="rounded-[22px] border border-[rgba(71,46,31,0.1)] bg-white/45 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-serif text-[clamp(1.5rem,2.4vw,2rem)] leading-none text-[#2a211c]">{column.status}</h2>
                  <span className="rounded-full bg-[rgba(138,90,68,0.1)] px-3 py-1 text-sm font-semibold text-[#8a5a44]">
                    {column.tasks.length}
                  </span>
                </div>
                <div className="grid gap-3">
                  {column.tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`rounded-[22px] border p-4 text-left transition ${
                        selectedTaskId === task.id
                          ? "border-[#8a5a44] bg-[linear-gradient(180deg,#fffaf2_0%,#fbf3e4_100%)] shadow-[0_18px_36px_rgba(72,40,23,0.08)]"
                          : "border-[rgba(71,46,31,0.12)] bg-[#fffaf2] hover:border-[rgba(138,90,68,0.35)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <strong className="text-base text-[#2a211c]">{task.title}</strong>
                        <PriorityBadge priority={task.priority} />
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-[#6a5a51]">
                        <span>Owner: {task.responsible || "Unassigned"}</span>
                        <span>
                          Due: {formatDisplayDate(task.effectiveDeadline || task.deadline || task.effectiveEndDate || task.endDate)}
                        </span>
                        {task.delayDays > 0 ? (
                          <span className="font-semibold text-[#8a5a44]">
                            Delayed +{task.delayDays}d{task.delayReason ? ` from ${task.delayReason}` : ""}
                          </span>
                        ) : null}
                        {task.blockerTitles?.length ? <span>Depends on: {task.blockerTitles.join(", ")}</span> : null}
                      </div>

                      {selectedTaskId === task.id && draft ? (
                        <div
                          className="mt-4 grid gap-3 rounded-[20px] border border-[rgba(71,46,31,0.12)] bg-white/70 p-4"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="grid gap-3 sm:grid-cols-2">
                            <DetailField label="Status">
                              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className={detailInputClass}>
                                {[...new Set([...(board?.statuses || []), "Done"])].map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </DetailField>

                            <DetailField label="Priority">
                              <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })} className={detailInputClass}>
                                {[...new Set([...preferredPriorities, ...(board?.tasks.map((item) => item.priority) || [])])].map((priority) => (
                                  <option key={priority} value={priority}>
                                    {priority}
                                  </option>
                                ))}
                              </select>
                            </DetailField>

                            <DetailField label="Responsible">
                              <input value={draft.responsible} onChange={(event) => setDraft({ ...draft, responsible: event.target.value })} className={detailInputClass} />
                            </DetailField>

                            <DetailField label="Category">
                              <input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className={detailInputClass} />
                            </DetailField>

                            <DetailField label="Location">
                              <input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} className={detailInputClass} />
                            </DetailField>

                            <DetailField label="Dependencies">
                              <input
                                value={draft.dependency}
                                onChange={(event) => setDraft({ ...draft, dependency: event.target.value })}
                                className={detailInputClass}
                                placeholder="Task A + Task B"
                              />
                            </DetailField>

                            <DetailField label="Start date">
                              <input
                                value={draft.startDate}
                                onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
                                className={detailInputClass}
                                placeholder="YYYY-MM-DD or DD/MM/YYYY"
                              />
                            </DetailField>

                            <DetailField label="End / deadline">
                              <input
                                value={draft.endDate || draft.deadline}
                                onChange={(event) =>
                                  setDraft({
                                    ...draft,
                                    endDate: selectedTask?.startDate ? event.target.value : "",
                                    deadline: selectedTask?.startDate ? draft.deadline : event.target.value
                                  })
                                }
                                className={detailInputClass}
                                placeholder="YYYY-MM-DD or DD/MM/YYYY"
                              />
                            </DetailField>
                          </div>

                          <DetailField label="Notes">
                            <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className={`${detailInputClass} min-h-24`} />
                          </DetailField>

                          <div className="flex flex-col gap-3 rounded-2xl border border-[rgba(71,46,31,0.12)] bg-white/55 p-4 text-sm text-[#6a5a51]">
                            <div>Effective date: {formatDisplayDate(task.effectiveDeadline || task.effectiveEndDate || task.deadline || task.endDate)}</div>
                            <div>Delay: {task.delayDays ? `+${task.delayDays} days` : "On plan"}</div>
                            {task.delayReason ? <div>Driver: {task.delayReason}</div> : null}
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={handleSave}
                              disabled={saving}
                              className="rounded-full bg-gradient-to-br from-[#5d3426] to-[#8a5a44] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                            >
                              {saving ? "Saving..." : "Save changes"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedTaskId("")}
                              className="rounded-full border border-[rgba(71,46,31,0.12)] bg-white px-5 py-3 text-sm font-semibold text-[#5d3426]"
                            >
                              Close
                            </button>
                          </div>
                          {error ? <p className="text-sm text-[#8a5a44]">{error}</p> : null}
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function CenteredCard({ title, subtitle, children }) {
  return (
    <div className="mx-auto flex min-h-screen w-[min(calc(100%-20px),520px)] items-center py-8">
      <section className="w-full rounded-[28px] border border-white/70 bg-[rgba(255,250,243,0.84)] p-6 shadow-[0_24px_80px_rgba(72,40,23,0.12)] backdrop-blur-xl md:p-8">
        <p className="text-xs uppercase tracking-[0.14em] text-[#5d3426]">Private area</p>
        <h1 className="mt-2 font-serif text-[clamp(2.4rem,5vw,3.6rem)] leading-[0.95] text-[#2a211c]">{title}</h1>
        <p className="mt-4 text-base leading-7 text-[#6a5a51]">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}

function PrivateBoardLanding({ authenticated, onLogout }) {
  return (
    <CenteredCard title="Private planning boards" subtitle="Two separate trackers are available for your wedding work and your admin tasks.">
      <div className="grid gap-3">
        <a className="rounded-2xl border border-[rgba(71,46,31,0.12)] bg-white/70 px-5 py-4 font-semibold text-[#5d3426]" href="#/private/wedding">
          Open wedding tracker
        </a>
        <a className="rounded-2xl border border-[rgba(71,46,31,0.12)] bg-white/70 px-5 py-4 font-semibold text-[#5d3426]" href="#/private/admin">
          Open admin tracker
        </a>
        {authenticated ? (
          <button type="button" onClick={onLogout} className="rounded-full bg-[#5d3426] px-5 py-3 font-semibold text-white">
            Lock boards
          </button>
        ) : null}
      </div>
    </CenteredCard>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-[rgba(71,46,31,0.12)] bg-[#fffaf2] p-5">
      <p className="text-xs uppercase tracking-[0.12em] text-[#8a5a44]">{label}</p>
      <strong className="mt-2 block font-serif text-4xl leading-none text-[#2a211c]">{value}</strong>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const styles = {
    Critical: "bg-[#7e2f2f] text-white",
    High: "bg-[#c57c4f] text-white",
    Medium: "bg-[#ead7a8] text-[#5d3426]",
    Low: "bg-[#d9e7d3] text-[#4f6646]"
  };

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[priority] || "bg-[#eee7df] text-[#5d3426]"}`}>{priority}</span>;
}

function DetailField({ label, children }) {
  return (
    <label className="grid gap-2 text-sm text-[#6a5a51]">
      <span>{label}</span>
      {children}
    </label>
  );
}

const detailInputClass =
  "w-full rounded-2xl border border-[rgba(93,52,38,0.16)] bg-white px-4 py-3 text-sm text-[#2a211c] outline-none focus:ring-2 focus:ring-[rgba(200,158,91,0.45)]";
