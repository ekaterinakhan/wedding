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

const insertRsvp = db.prepare(`
  INSERT INTO rsvps (
    submitted_at, language, name, email, phone, attendance, events, menu, transfer, dietary, notes, plus_one, plus_one_name, plus_one_menu
  ) VALUES (
    @submittedAt, @language, @name, @email, @phone, @attendance, @events, @menu, @transfer, @dietary, @notes, @plusOne, @plusOneName, @plusOneMenu
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
    transfer,
    dietary,
    notes,
    plus_one,
    plus_one_name,
    plus_one_menu
  FROM rsvps
  ORDER BY datetime(submitted_at) DESC, id DESC
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
  const payload = {
    submittedAt: req.body.submittedAt || new Date().toISOString(),
    language: req.body.language || "",
    name: (req.body.name || "").trim(),
    email: (req.body.email || "").trim(),
    phone: (req.body.phone || "").trim(),
    attendance: req.body.attendance || "",
    events: req.body.events || "",
    menu: req.body.menu || "",
    transfer: req.body.transfer || "",
    dietary: (req.body.dietary || "").trim(),
    notes: (req.body.notes || "").trim(),
    plusOne: req.body.plusOne || "",
    plusOneName: (req.body.plusOneName || "").trim(),
    plusOneMenu: req.body.plusOneMenu || ""
  };

  if (!payload.name || !payload.email) {
    res.status(400).json({ error: "Name and email are required." });
    return;
  }

  const result = insertRsvp.run(payload);
  res.status(201).json({ ok: true, id: result.lastInsertRowid });
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
          <td>${escapeHtml(row.transfer)}</td>
          <td>${escapeHtml(row.dietary)}</td>
          <td>${escapeHtml(row.notes)}</td>
          <td>${escapeHtml(row.plus_one)}</td>
          <td>${escapeHtml(row.plus_one_name)}</td>
          <td>${escapeHtml(row.plus_one_menu)}</td>
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
                  <th>Menu</th>
                  <th>Transfer</th>
                  <th>Dietary</th>
                  <th>Notes</th>
                  <th>+1</th>
                  <th>+1 Name</th>
                  <th>+1 Menu</th>
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

app.listen(port, () => {
  console.log(`RSVP server running at http://127.0.0.1:${port}`);
  console.log(`Responses table available at http://127.0.0.1:${port}/responses`);
  console.log(`Private boards available at http://127.0.0.1:4175/#/private/wedding and http://127.0.0.1:4175/#/private/admin`);
});
