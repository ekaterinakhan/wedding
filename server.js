import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import express from "express";

const app = express();
const port = Number(process.env.PORT || 8787);
const dbDir = path.join(process.cwd(), "data");
const dbPath = path.join(dbDir, "rsvps.sqlite");
const boardsDir = path.join(dbDir, "boards");
const privateConfigPath = path.join(dbDir, "private-config.json");
const SESSION_COOKIE = "private_board_auth";
const DAY_MS = 24 * 60 * 60 * 1000;

fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submitted_at TEXT NOT NULL,
    language TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    attendance TEXT,
    events TEXT,
    menu TEXT,
    transfer TEXT,
    dietary TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS board_task_overrides (
    board_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    status TEXT,
    priority TEXT,
    responsible TEXT,
    location TEXT,
    deadline TEXT,
    start_date TEXT,
    end_date TEXT,
    dependency TEXT,
    category TEXT,
    notes TEXT,
    PRIMARY KEY (board_id, task_id)
  );
`);

function ensureColumn(tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

ensureColumn("rsvps", "plus_one", "TEXT");
ensureColumn("rsvps", "plus_one_name", "TEXT");
ensureColumn("rsvps", "plus_one_menu", "TEXT");
ensureColumn("rsvps", "starter", "TEXT");
ensureColumn("rsvps", "main", "TEXT");
ensureColumn("rsvps", "dessert", "TEXT");
ensureColumn("rsvps", "plus_one_starter", "TEXT");
ensureColumn("rsvps", "plus_one_main", "TEXT");
ensureColumn("rsvps", "plus_one_dessert", "TEXT");
ensureColumn("rsvps", "arrival_datetime", "TEXT");
ensureColumn("rsvps", "arrival_location", "TEXT");
ensureColumn("rsvps", "return_datetime", "TEXT");
ensureColumn("rsvps", "return_location", "TEXT");
ensureColumn("rsvps", "transfer_party_size", "TEXT");
ensureColumn("rsvps", "kids", "TEXT");
ensureColumn("rsvps", "token", "TEXT");

const insertRsvp = db.prepare(`
  INSERT INTO rsvps (
    submitted_at, language, name, email, phone, attendance, events, menu, starter, main, dessert, transfer, dietary, notes, plus_one, plus_one_name, plus_one_menu, plus_one_starter, plus_one_main, plus_one_dessert, arrival_datetime, arrival_location, return_datetime, return_location, transfer_party_size, kids, token
  ) VALUES (
    @submittedAt, @language, @name, @email, @phone, @attendance, @events, @menu, @starter, @main, @dessert, @transfer, @dietary, @notes, @plusOne, @plusOneName, @plusOneMenu, @plusOneStarter, @plusOneMain, @plusOneDessert, @arrivalDateTime, @arrivalLocation, @returnDateTime, @returnLocation, @transferPartySize, @kids, @token
  )
`);

const selectRsvps = db.prepare(`
  SELECT
    id,
    submitted_at,
    language,
    name,
    email,
    phone,
    attendance,
    events,
    menu,
    starter,
    main,
    dessert,
    transfer,
    dietary,
    notes,
    plus_one,
    plus_one_name,
    plus_one_menu,
    plus_one_starter,
    plus_one_main,
    plus_one_dessert,
    arrival_datetime,
    arrival_location,
    return_datetime,
    return_location,
    transfer_party_size,
    kids,
    token
  FROM rsvps
  ORDER BY datetime(submitted_at) DESC, id DESC
`);

const selectRsvpByToken = db.prepare(`
  SELECT *
  FROM rsvps
  WHERE token = ?
  LIMIT 1
`);

const updateRsvpByToken = db.prepare(`
  UPDATE rsvps
  SET
    language = @language,
    name = @name,
    email = @email,
    phone = @phone,
    attendance = @attendance,
    events = @events,
    menu = @menu,
    starter = @starter,
    main = @main,
    dessert = @dessert,
    transfer = @transfer,
    dietary = @dietary,
    notes = @notes,
    plus_one = @plusOne,
    plus_one_name = @plusOneName,
    plus_one_menu = @plusOneMenu,
    plus_one_starter = @plusOneStarter,
    plus_one_main = @plusOneMain,
    plus_one_dessert = @plusOneDessert,
    arrival_datetime = @arrivalDateTime,
    arrival_location = @arrivalLocation,
    return_datetime = @returnDateTime,
    return_location = @returnLocation,
    transfer_party_size = @transferPartySize,
    kids = @kids
  WHERE token = @token
`);

const selectBoardOverrides = db.prepare(`
  SELECT
    task_id,
    status,
    priority,
    responsible,
    location,
    deadline,
    start_date,
    end_date,
    dependency,
    category,
    notes
  FROM board_task_overrides
  WHERE board_id = ?
`);

const upsertBoardOverride = db.prepare(`
  INSERT INTO board_task_overrides (
    board_id,
    task_id,
    status,
    priority,
    responsible,
    location,
    deadline,
    start_date,
    end_date,
    dependency,
    category,
    notes
  ) VALUES (
    @boardId,
    @taskId,
    @status,
    @priority,
    @responsible,
    @location,
    @deadline,
    @startDate,
    @endDate,
    @dependency,
    @category,
    @notes
  )
  ON CONFLICT(board_id, task_id) DO UPDATE SET
    status = excluded.status,
    priority = excluded.priority,
    responsible = excluded.responsible,
    location = excluded.location,
    deadline = excluded.deadline,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    dependency = excluded.dependency,
    category = excluded.category,
    notes = excluded.notes
`);

app.use(express.json());

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readPrivateConfig() {
  if (fs.existsSync(privateConfigPath)) {
    return JSON.parse(fs.readFileSync(privateConfigPath, "utf8"));
  }

  const config = {
    boardPassword: crypto.randomBytes(9).toString("base64url")
  };

  fs.writeFileSync(privateConfigPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Private board password created in ${privateConfigPath}`);
  console.log(`Board password: ${config.boardPassword}`);
  return config;
}

const privateConfig = readPrivateConfig();

function parseCookies(header) {
  return Object.fromEntries(
    String(header || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, ...rest] = part.split("=");
        return [key, decodeURIComponent(rest.join("="))];
      })
  );
}

function requireBoardAuth(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[SESSION_COOKIE] === "1") {
    next();
    return;
  }

  res.status(401).json({ error: "Authentication required." });
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00Z`);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split("/");
    return new Date(`${year}-${month}-${day}T00:00:00Z`);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateValue(date, format) {
  if (!date) {
    return "";
  }

  const utcDate = new Date(date);
  const year = utcDate.getUTCFullYear();
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utcDate.getUTCDate()).padStart(2, "0");
  return format === "iso" ? `${year}-${month}-${day}` : `${day}/${month}/${year}`;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function diffInDays(later, earlier) {
  return Math.max(0, Math.ceil((later.getTime() - earlier.getTime()) / DAY_MS));
}

function parseWeddingCsv(filePath) {
  const lines = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^"|"$/g, ""));

  const rows = lines.map((line) => line.split(","));

  return rows.slice(1).map((parts) => {
    const [task = "", status = "", priority = "", responsible = "", location = "", deadline = "", ...notesParts] = parts;
    const notes = notesParts.join(",").trim();

    return {
      id: slugify(task),
      title: task.trim(),
      status: status.trim() || "Not started",
      priority: priority.trim() || "Medium",
      responsible: responsible.trim() || "",
      location: location.trim() || "",
      deadline: deadline.trim() || "",
      startDate: "",
      endDate: "",
      dependency: "",
      category: "Wedding",
      notes
    };
  });
}

function parseAdminCsv(filePath) {
  const lines = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const header = lines[0].split("|").map((part) => part.trim());

  return lines.slice(1).map((line) => {
    const parts = line.split("|").map((part) => part.trim());
    const row = Object.fromEntries(header.map((key, index) => [key, parts[index] || ""]));
    const title = row.Task || "";

    return {
      id: slugify(title),
      title,
      status: row.Status || "Planned",
      priority: row.Priority || "Medium",
      responsible: row.Owner || "",
      location: "",
      deadline: row["End Date"] || "",
      startDate: row["Start Date"] || "",
      endDate: row["End Date"] || "",
      dependency: row.Dependency || "",
      category: row.Category || "General",
      notes: ""
    };
  });
}

function mergeBoardTasks(boardId, baseTasks) {
  const overrides = new Map(
    selectBoardOverrides.all(boardId).map((row) => [
      row.task_id,
      {
        status: row.status,
        priority: row.priority,
        responsible: row.responsible,
        location: row.location,
        deadline: row.deadline,
        startDate: row.start_date,
        endDate: row.end_date,
        dependency: row.dependency,
        category: row.category,
        notes: row.notes
      }
    ])
  );

  const tasks = baseTasks.map((task) => ({
    ...task,
    ...(overrides.get(task.id) || {})
  }));

  const titleMap = new Map(tasks.map((task) => [task.title, task]));
  const preferredStatuses = ["Critical", "Not started", "Planned", "Waiting", "In progress", "Done"];
  const visited = new Map();

  function computeTask(task, chain = []) {
    if (visited.has(task.id)) {
      return visited.get(task.id);
    }

    if (chain.includes(task.id)) {
      const result = {
        effectiveStartDate: task.startDate,
        effectiveEndDate: task.endDate,
        effectiveDeadline: task.deadline,
        delayDays: 0,
        delayReason: "Dependency cycle"
      };
      visited.set(task.id, result);
      return result;
    }

    const start = parseDateValue(task.startDate);
    const end = parseDateValue(task.endDate);
    const deadline = parseDateValue(task.deadline);
    const dependencyNames = String(task.dependency || "")
      .split(/[+,;]/)
      .map((part) => part.trim())
      .filter(Boolean);

    let shiftDays = 0;
    let reason = "";

    dependencyNames.forEach((dependencyName) => {
      const dependencyTask = titleMap.get(dependencyName);
      if (!dependencyTask) {
        return;
      }

      const dependencyResult = computeTask(dependencyTask, [...chain, task.id]);
      const dependencyDate =
        parseDateValue(dependencyResult.effectiveEndDate) ||
        parseDateValue(dependencyResult.effectiveDeadline) ||
        parseDateValue(dependencyResult.effectiveStartDate);

      if (!dependencyDate) {
        return;
      }

      if (start) {
        const diff = diffInDays(dependencyDate, start);
        if (diff > shiftDays) {
          shiftDays = diff;
          reason = dependencyName;
        }
      } else if (deadline) {
        const diff = diffInDays(dependencyDate, deadline);
        if (diff > shiftDays) {
          shiftDays = diff;
          reason = dependencyName;
        }
      }
    });

    const result = {
      effectiveStartDate: start ? formatDateValue(addDays(start, shiftDays), "iso") : "",
      effectiveEndDate: end ? formatDateValue(addDays(end, shiftDays), "iso") : "",
      effectiveDeadline: deadline ? formatDateValue(addDays(deadline, shiftDays), task.deadline?.includes("/") ? "slash" : "iso") : "",
      delayDays: shiftDays,
      delayReason: reason
    };

    visited.set(task.id, result);
    return result;
  }

  const hydratedTasks = tasks.map((task) => {
    const derived = computeTask(task);
    return {
      ...task,
      ...derived,
      blockerTitles: String(task.dependency || "")
        .split(/[+,;]/)
        .map((part) => part.trim())
        .filter(Boolean)
    };
  });

  const statuses = [...new Set([...hydratedTasks.map((task) => task.status).filter(Boolean), "Done"])].sort((a, b) => {
    const ai = preferredStatuses.indexOf(a);
    const bi = preferredStatuses.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a.localeCompare(b);
  });

  return {
    statuses,
    tasks: hydratedTasks
  };
}

function loadBoard(boardId) {
  const fileMap = {
    wedding: path.join(boardsDir, "wedding.csv"),
    admin: path.join(boardsDir, "admin.csv")
  };

  const filePath = fileMap[boardId];
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  const baseTasks = boardId === "wedding" ? parseWeddingCsv(filePath) : parseAdminCsv(filePath);
  const merged = mergeBoardTasks(boardId, baseTasks);

  return {
    id: boardId,
    title: boardId === "wedding" ? "Wedding Tracker" : "Admin Tracker",
    description:
      boardId === "wedding"
        ? "Planning tasks for the wedding weekend."
        : "Administrative and visa-related planning tasks.",
    ...merged
  };
}

app.post("/api/private/login", (req, res) => {
  if ((req.body.password || "") !== privateConfig.boardPassword) {
    res.status(401).json({ error: "Invalid password." });
    return;
  }

  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=1; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);
  res.json({ ok: true });
});

app.post("/api/private/logout", (_req, res) => {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
  res.json({ ok: true });
});

app.get("/api/private/session", (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  res.json({ authenticated: cookies[SESSION_COOKIE] === "1" });
});

app.get("/api/private/rsvps", requireBoardAuth, (_req, res) => {
  const rsvps = selectRsvps.all();
  const people = [];
  let vid = 100000;

  for (const r of rsvps) {
    const attending = r.attendance !== "no";
    people.push({
      id: r.id,
      submitted_at: r.submitted_at,
      name: r.name,
      email: r.email,
      phone: r.phone,
      attendance: r.attendance,
      events: r.events,
      guest_type: "primary",
      primary_guest_id: null,
      rsvp_id: r.id,
      menu: r.menu,
      dietary: r.dietary,
      notes: r.notes,
      transfer: r.transfer,
      arrival_datetime: r.arrival_datetime,
      arrival_location: r.arrival_location,
      return_datetime: r.return_datetime,
      return_location: r.return_location,
      transfer_party_size: r.transfer_party_size,
    });

    if (!attending) continue;

    if (r.plus_one === "yes" && r.plus_one_name) {
      people.push({
        id: vid++,
        submitted_at: r.submitted_at,
        name: r.plus_one_name,
        guest_type: "plus_one",
        primary_guest_id: r.id,
        rsvp_id: r.id,
        menu: r.plus_one_menu,
        dietary: null,
        notes: null,
        events: r.events,
        attendance: "yes",
      });
    }

    let kids = [];
    try { kids = JSON.parse(r.kids || "[]"); } catch { /* empty */ }
    for (const kid of kids) {
      people.push({
        id: vid++,
        submitted_at: r.submitted_at,
        name: kid.name,
        guest_type: "child",
        primary_guest_id: r.id,
        rsvp_id: r.id,
        menu: "kids",
        dietary: kid.dietary,
        notes: null,
        events: r.events,
        attendance: "yes",
      });
    }
  }

  res.json(people);
});

app.get("/api/private/boards/:boardId", requireBoardAuth, (req, res) => {
  const board = loadBoard(req.params.boardId);

  if (!board) {
    res.status(404).json({ error: "Board not found." });
    return;
  }

  res.json(board);
});

app.put("/api/private/boards/:boardId/tasks/:taskId", requireBoardAuth, (req, res) => {
  const board = loadBoard(req.params.boardId);
  if (!board) {
    res.status(404).json({ error: "Board not found." });
    return;
  }

  const task = board.tasks.find((item) => item.id === req.params.taskId);
  if (!task) {
    res.status(404).json({ error: "Task not found." });
    return;
  }

  const payload = {
    boardId: req.params.boardId,
    taskId: req.params.taskId,
    status: req.body.status ?? task.status,
    priority: req.body.priority ?? task.priority,
    responsible: req.body.responsible ?? task.responsible,
    location: req.body.location ?? task.location,
    deadline: req.body.deadline ?? task.deadline,
    startDate: req.body.startDate ?? task.startDate,
    endDate: req.body.endDate ?? task.endDate,
    dependency: req.body.dependency ?? task.dependency,
    category: req.body.category ?? task.category,
    notes: req.body.notes ?? task.notes
  };

  upsertBoardOverride.run(payload);
  res.json(loadBoard(req.params.boardId));
});

app.post("/api/rsvps", (req, res) => {
  const token = crypto.randomUUID();
  const kids = Array.isArray(req.body.kids) ? req.body.kids.slice(0, 3).filter((kid) => (kid?.name || "").trim()) : [];
  const payload = {
    submittedAt: req.body.submittedAt || new Date().toISOString(),
    language: req.body.language || "",
    name: (req.body.name || "").trim(),
    email: (req.body.email || "").trim(),
    phone: (req.body.phone || "").trim(),
    attendance: req.body.attendance || "",
    events: req.body.events || "",
    menu: req.body.menu || "",
    starter: req.body.starter || "",
    main: req.body.main || "",
    dessert: req.body.dessert || "",
    transfer: req.body.transfer || "",
    dietary: (req.body.dietary || "").trim(),
    notes: (req.body.notes || "").trim(),
    plusOne: req.body.plusOne || "",
    plusOneName: (req.body.plusOneName || "").trim(),
    plusOneMenu: req.body.plusOneMenu || "",
    plusOneStarter: req.body.plusOneStarter || "",
    plusOneMain: req.body.plusOneMain || "",
    plusOneDessert: req.body.plusOneDessert || "",
    arrivalDateTime: (req.body.arrivalDateTime || "").trim(),
    arrivalLocation: (req.body.arrivalLocation || "").trim(),
    returnDateTime: (req.body.returnDateTime || "").trim(),
    returnLocation: (req.body.returnLocation || "").trim(),
    transferPartySize: (req.body.transferPartySize || "").trim(),
    kids: JSON.stringify(kids),
    token
  };

  if (!payload.name || !payload.email) {
    res.status(400).json({ error: "Name and email are required." });
    return;
  }

  if (payload.attendance !== "no") {
    if (!payload.starter || !payload.main || !payload.dessert) {
      res.status(400).json({ error: "Menu choice is required." });
      return;
    }
    if (payload.plusOne === "yes" && (!payload.plusOneStarter || !payload.plusOneMain || !payload.plusOneDessert)) {
      res.status(400).json({ error: "Menu choice for +1 is required." });
      return;
    }
  }

  const result = insertRsvp.run(payload);
  res.status(201).json({ ok: true, id: result.lastInsertRowid, token });
});

app.get("/api/rsvps/:token", (req, res) => {
  const row = selectRsvpByToken.get(req.params.token);
  if (!row) {
    res.status(404).json({ error: "RSVP not found." });
    return;
  }

  let kids = [];
  try { kids = JSON.parse(row.kids || "[]"); } catch { kids = []; }

  res.json({
    name: row.name || "",
    email: row.email || "",
    phone: row.phone || "",
    language: row.language || "",
    attendance: row.attendance || "",
    events: row.events || "",
    menu: row.menu || "",
    starter: row.starter || "",
    main: row.main || "",
    dessert: row.dessert || "",
    transfer: row.transfer || "",
    dietary: row.dietary || "",
    notes: row.notes || "",
    plusOne: row.plus_one || "",
    plusOneName: row.plus_one_name || "",
    plusOneMenu: row.plus_one_menu || "",
    plusOneStarter: row.plus_one_starter || "",
    plusOneMain: row.plus_one_main || "",
    plusOneDessert: row.plus_one_dessert || "",
    arrivalDateTime: row.arrival_datetime || "",
    arrivalLocation: row.arrival_location || "",
    returnDateTime: row.return_datetime || "",
    returnLocation: row.return_location || "",
    transferPartySize: row.transfer_party_size || "",
    kids,
    token: row.token || ""
  });
});

app.post("/api/rsvps/recover", (req, res) => {
  const email = (req.body.email || "").trim();
  if (!email) {
    res.status(400).json({ error: "Email is required." });
    return;
  }

  const row = db.prepare(
    "SELECT * FROM rsvps WHERE lower(email) = lower(?) ORDER BY submitted_at DESC LIMIT 1"
  ).get(email);

  if (!row || !row.token) {
    res.status(404).json({ error: "RSVP not found." });
    return;
  }

  let kids = [];
  try { kids = JSON.parse(row.kids || "[]"); } catch { kids = []; }

  res.json({
    name: row.name || "",
    email: row.email || "",
    phone: row.phone || "",
    language: row.language || "",
    attendance: row.attendance || "",
    events: row.events || "",
    menu: row.menu || "",
    starter: row.starter || "",
    main: row.main || "",
    dessert: row.dessert || "",
    transfer: row.transfer || "",
    dietary: row.dietary || "",
    notes: row.notes || "",
    plusOne: row.plus_one || "",
    plusOneName: row.plus_one_name || "",
    plusOneMenu: row.plus_one_menu || "",
    plusOneStarter: row.plus_one_starter || "",
    plusOneMain: row.plus_one_main || "",
    plusOneDessert: row.plus_one_dessert || "",
    arrivalDateTime: row.arrival_datetime || "",
    arrivalLocation: row.arrival_location || "",
    returnDateTime: row.return_datetime || "",
    returnLocation: row.return_location || "",
    transferPartySize: row.transfer_party_size || "",
    kids,
    token: row.token || ""
  });
});

app.put("/api/rsvps/:token", (req, res) => {
  const row = selectRsvpByToken.get(req.params.token);
  if (!row) {
    res.status(404).json({ error: "RSVP not found." });
    return;
  }

  const kids = Array.isArray(req.body.kids) ? req.body.kids.slice(0, 3).filter((kid) => (kid?.name || "").trim()) : [];
  const payload = {
    token: req.params.token,
    language: req.body.language || row.language || "",
    name: (req.body.name || row.name || "").trim(),
    email: (req.body.email || row.email || "").trim(),
    phone: (req.body.phone || row.phone || "").trim(),
    attendance: req.body.attendance || row.attendance || "",
    events: req.body.events || row.events || "",
    menu: req.body.menu || "",
    starter: req.body.starter || "",
    main: req.body.main || "",
    dessert: req.body.dessert || "",
    transfer: req.body.transfer || "",
    dietary: (req.body.dietary || "").trim(),
    notes: (req.body.notes || row.notes || "").trim(),
    plusOne: req.body.plusOne || "",
    plusOneName: (req.body.plusOneName || row.plus_one_name || "").trim(),
    plusOneMenu: req.body.plusOneMenu || "",
    plusOneStarter: req.body.plusOneStarter || "",
    plusOneMain: req.body.plusOneMain || "",
    plusOneDessert: req.body.plusOneDessert || "",
    arrivalDateTime: (req.body.arrivalDateTime || "").trim(),
    arrivalLocation: (req.body.arrivalLocation || "").trim(),
    returnDateTime: (req.body.returnDateTime || "").trim(),
    returnLocation: (req.body.returnLocation || "").trim(),
    transferPartySize: (req.body.transferPartySize || "").trim(),
    kids: JSON.stringify(kids)
  };

  if (!payload.name || !payload.email) {
    res.status(400).json({ error: "Name and email are required." });
    return;
  }

  if (payload.attendance !== "no") {
    if (!payload.starter || !payload.main || !payload.dessert) {
      res.status(400).json({ error: "Menu choice is required." });
      return;
    }
    if (payload.plusOne === "yes" && (!payload.plusOneStarter || !payload.plusOneMain || !payload.plusOneDessert)) {
      res.status(400).json({ error: "Menu choice for +1 is required." });
      return;
    }
  }

  updateRsvpByToken.run(payload);
  res.json({ ok: true, token: req.params.token });
});

app.get("/api/country", (req, res) => {
  // In production this is handled by the Cloudflare Pages Function (functions/api/country.js)
  // which reads the CF-IPCountry header. For local dev we fall back to Accept-Language.
  const lang = req.headers["accept-language"] || "";
  const match = lang.match(/[a-z]{2}-([A-Z]{2})/);
  const country = match ? match[1] : "XX";
  res.json({ country });
});

app.get("/api/rsvps", (_req, res) => {
  res.json(selectRsvps.all());
});

app.get("/responses", (_req, res) => {
  const rows = selectRsvps.all();
  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.id)}</td>
          <td>${escapeHtml(row.submitted_at)}</td>
          <td>${escapeHtml(row.language)}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.email)}</td>
          <td>${escapeHtml(row.phone)}</td>
          <td>${escapeHtml(row.attendance)}</td>
          <td>${escapeHtml(row.events)}</td>
          <td>${escapeHtml(row.menu)}</td>
          <td>${escapeHtml(row.starter)}</td>
          <td>${escapeHtml(row.main)}</td>
          <td>${escapeHtml(row.dessert)}</td>
          <td>${escapeHtml(row.transfer)}</td>
          <td>${escapeHtml(row.dietary)}</td>
          <td>${escapeHtml(row.notes)}</td>
          <td>${escapeHtml(row.plus_one)}</td>
          <td>${escapeHtml(row.plus_one_name)}</td>
          <td>${escapeHtml(row.plus_one_menu)}</td>
          <td>${escapeHtml(row.plus_one_starter)}</td>
          <td>${escapeHtml(row.plus_one_main)}</td>
          <td>${escapeHtml(row.plus_one_dessert)}</td>
          <td>${escapeHtml(row.arrival_datetime)}</td>
          <td>${escapeHtml(row.arrival_location)}</td>
          <td>${escapeHtml(row.return_datetime)}</td>
          <td>${escapeHtml(row.return_location)}</td>
          <td>${escapeHtml(row.transfer_party_size)}</td>
        </tr>
      `
    )
    .join("");

  res.type("html").send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>RSVP Responses</title>
        <style>
          body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #f7efe2; color: #2a211c; }
          .page { max-width: 1400px; margin: 32px auto; padding: 0 20px; }
          h1 { margin: 0 0 8px; font-size: 2rem; }
          p { margin: 0 0 20px; color: #6a5a51; }
          .card { overflow: auto; border: 1px solid rgba(71, 46, 31, 0.12); border-radius: 20px; background: rgba(255, 250, 243, 0.92); box-shadow: 0 24px 80px rgba(72, 40, 23, 0.1); }
          table { width: 100%; border-collapse: collapse; min-width: 1100px; }
          th, td { padding: 14px 16px; text-align: left; vertical-align: top; border-bottom: 1px solid rgba(71, 46, 31, 0.1); }
          th { position: sticky; top: 0; background: #fff7ec; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; color: #5d3426; }
          tr:last-child td { border-bottom: 0; }
        </style>
      </head>
      <body>
        <main class="page">
          <h1>RSVP Responses</h1>
          <p>Database file: ${escapeHtml(dbPath)}</p>
          <div class="card">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Submitted At</th>
                  <th>Lang</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Attendance</th>
                  <th>Events</th>
                  <th>Menu Summary</th>
                  <th>Starter</th>
                  <th>Main</th>
                  <th>Dessert</th>
                  <th>Transfer</th>
                  <th>Dietary</th>
                  <th>Notes</th>
                  <th>+1</th>
                  <th>+1 Name</th>
                  <th>+1 Menu Summary</th>
                  <th>+1 Starter</th>
                  <th>+1 Main</th>
                  <th>+1 Dessert</th>
                  <th>Paris Arrival</th>
                  <th>Arrival Airport / Station</th>
                  <th>Return Time</th>
                  <th>Return Airport / Station</th>
                  <th>Transfer Count</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>
        </main>
      </body>
    </html>
  `);
});

app.listen(port, "127.0.0.1", () => {
  console.log(`RSVP server running at http://127.0.0.1:${port}`);
  console.log(`Responses table available at http://127.0.0.1:${port}/responses`);
  console.log(`Admin panel: open /admin on your Vite dev server (default http://localhost:5173/admin)`);
  console.log(`Private boards: open #/private/wedding or #/private/admin on your Vite dev server`);
});
