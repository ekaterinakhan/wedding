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
const GATE_COOKIE = "wedding_guest_auth";
const DEFAULT_SITE_PASSWORD = "E&L09052026";
const DEFAULT_ALBUM_PATH = "data/photoalbum";
const DEFAULT_ALBUM_BRANCH = "main";
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

const selectAttendingRsvps = db.prepare(`
  SELECT id, submitted_at, name, email, phone, attendance, plus_one, plus_one_name,
         starter, main, dessert, plus_one_starter, plus_one_main, plus_one_dessert,
         menu, plus_one_menu, kids, token
  FROM rsvps
  WHERE attendance != 'no'
  ORDER BY datetime(submitted_at) DESC, id DESC
`);

const updateRsvpMenuByToken = db.prepare(`
  UPDATE rsvps
  SET
    starter = @starter,
    main = @main,
    dessert = @dessert,
    menu = @menu,
    plus_one_starter = @plusOneStarter,
    plus_one_main = @plusOneMain,
    plus_one_dessert = @plusOneDessert,
    plus_one_menu = @plusOneMenu
  WHERE token = @token
`);

const updateRsvpTokenById = db.prepare(`
  UPDATE rsvps
  SET token = ?
  WHERE id = ?
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

function ensureLegacyRsvpToken(row) {
  if (!row) return null;
  if (row.token) return row;

  const token = crypto.randomUUID();
  updateRsvpTokenById.run(token, row.id);
  return { ...row, token };
}

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

function sitePassword() {
  return process.env.SITE_PASSWORD || DEFAULT_SITE_PASSWORD;
}

function gateToken() {
  return crypto.createHmac("sha256", sitePassword()).update("guest-session").digest("base64");
}

function requireGateAuth(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[GATE_COOKIE] === gateToken()) {
    next();
    return;
  }
  res.status(401).json({ error: "Authentication required." });
}

function albumConfig() {
  return {
    repo: process.env.GITHUB_REPO || "",
    branch: process.env.GITHUB_BRANCH || DEFAULT_ALBUM_BRANCH,
    path: (process.env.GITHUB_ALBUM_PATH || DEFAULT_ALBUM_PATH).replace(/^\/+|\/+$/g, ""),
    token: process.env.GITHUB_TOKEN || "",
  };
}

function githubHeaders() {
  const headers = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "scariot-wedding-album",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

function safeAlbumName(value) {
  const name = String(value || "photo").split(/[\\/]/).pop();
  return name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-") || `photo-${Date.now()}.jpg`;
}

function arrayBufferToBase64(buffer) {
  return Buffer.from(buffer).toString("base64");
}

async function listGithubAlbum() {
  const config = albumConfig();
  if (!config.repo || !config.path) {
    return { error: "GitHub album storage is not configured.", status: 503 };
  }
  const url = `https://api.github.com/repos/${config.repo}/contents/${encodeURIComponent(config.path).replaceAll("%2F", "/")}?ref=${encodeURIComponent(config.branch)}`;
  const response = await fetch(url, { headers: githubHeaders() });
  if (response.status === 404) return { photos: [] };
  if (!response.ok) return { error: "Could not read the GitHub album.", status: response.status };
  const rows = await response.json();
  const photos = (Array.isArray(rows) ? rows : [])
    .filter((item) => item.type === "file" && /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(item.name))
    .map((item) => ({ name: item.name, path: item.path, size: item.size, sha: item.sha, url: item.download_url }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return { photos };
}

function writeU16(value) {
  return Buffer.from([value & 255, (value >>> 8) & 255]);
}

function writeU32(value) {
  return Buffer.from([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]);
}

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}

function zipDateParts(date = new Date()) {
  return {
    dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    dosDate: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function buildStoredZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const { dosTime, dosDate } = zipDateParts();
  for (const file of files) {
    const nameBytes = Buffer.from(file.name);
    const data = Buffer.from(file.bytes);
    const crc = crc32(data);
    const local = Buffer.concat([
      writeU32(0x04034b50), writeU16(20), writeU16(0), writeU16(0), writeU16(dosTime), writeU16(dosDate),
      writeU32(crc), writeU32(data.length), writeU32(data.length), writeU16(nameBytes.length), writeU16(0), nameBytes, data,
    ]);
    locals.push(local);
    centrals.push(Buffer.concat([
      writeU32(0x02014b50), writeU16(20), writeU16(20), writeU16(0), writeU16(0), writeU16(dosTime), writeU16(dosDate),
      writeU32(crc), writeU32(data.length), writeU32(data.length), writeU16(nameBytes.length), writeU16(0), writeU16(0),
      writeU16(0), writeU16(0), writeU32(0), writeU32(offset), nameBytes,
    ]));
    offset += local.length;
  }
  const centralSize = centrals.reduce((sum, chunk) => sum + chunk.length, 0);
  return Buffer.concat([
    ...locals, ...centrals,
    writeU32(0x06054b50), writeU16(0), writeU16(0), writeU16(files.length), writeU16(files.length),
    writeU32(centralSize), writeU32(offset), writeU16(0),
  ]);
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

app.get("/api/gate/session", (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  res.json({ authenticated: cookies[GATE_COOKIE] === gateToken() });
});

app.post("/api/gate/login", (req, res) => {
  if ((req.body.password || "") !== sitePassword()) {
    res.status(401).json({ error: "Invalid password." });
    return;
  }
  res.setHeader("Set-Cookie", `${GATE_COOKIE}=${encodeURIComponent(gateToken())}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`);
  res.json({ ok: true });
});

app.post("/api/gate/logout", (_req, res) => {
  res.setHeader("Set-Cookie", `${GATE_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
  res.json({ ok: true });
});

app.get("/api/album/photos", requireGateAuth, async (_req, res) => {
  const album = await listGithubAlbum();
  if (album.error) {
    res.status(album.status || 500).json({ error: album.error });
    return;
  }
  res.json({ photos: album.photos });
});

app.get("/api/album/photos/:name/download", requireGateAuth, async (req, res) => {
  const album = await listGithubAlbum();
  if (album.error) {
    res.status(album.status || 500).json({ error: album.error });
    return;
  }
  const safeName = safeAlbumName(req.params.name);
  const photo = album.photos.find((item) => item.name === safeName);
  if (!photo) {
    res.status(404).json({ error: "Photo not found." });
    return;
  }
  const response = await fetch(photo.url, { headers: githubHeaders() });
  if (!response.ok) {
    res.status(response.status).json({ error: "Could not download the photo." });
    return;
  }
  res.setHeader("Content-Type", response.headers.get("Content-Type") || "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${photo.name.replaceAll('"', "")}"`);
  res.send(Buffer.from(await response.arrayBuffer()));
});

app.get("/api/album/download-all", requireGateAuth, async (_req, res) => {
  const album = await listGithubAlbum();
  if (album.error) {
    res.status(album.status || 500).json({ error: album.error });
    return;
  }
  const files = [];
  for (const photo of album.photos) {
    const response = await fetch(photo.url, { headers: githubHeaders() });
    if (response.ok) files.push({ name: photo.name, bytes: Buffer.from(await response.arrayBuffer()) });
  }
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="ekaterina-lucas-wedding-photos.zip"');
  res.send(buildStoredZip(files));
});

app.post("/api/private/album/photos", requireBoardAuth, async (req, res) => {
  const config = albumConfig();
  if (!config.repo || !config.path || !config.token) {
    res.status(503).json({ error: "GitHub upload storage is not configured." });
    return;
  }

  let form;
  try {
    const request = new Request(`http://${req.headers.host}${req.originalUrl}`, {
      method: req.method,
      headers: req.headers,
      body: req,
      duplex: "half",
    });
    form = await request.formData();
  } catch {
    res.status(400).json({ error: "Invalid upload." });
    return;
  }

  const file = form.get("photo");
  if (!(file instanceof File)) {
    res.status(400).json({ error: "No photo was attached." });
    return;
  }

  const safeName = `${Date.now()}-${safeAlbumName(file.name)}`;
  const uploadPath = `${config.path}/${safeName}`;
  const putUrl = `https://api.github.com/repos/${config.repo}/contents/${encodeURIComponent(uploadPath).replaceAll("%2F", "/")}`;
  const response = await fetch(putUrl, {
    method: "PUT",
    headers: githubHeaders(),
    body: JSON.stringify({
      message: `Add wedding album photo ${safeName}`,
      content: arrayBufferToBase64(await file.arrayBuffer()),
      branch: config.branch,
    }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    res.status(response.status).json({ error: json.message || "GitHub upload failed." });
    return;
  }
  res.status(201).json({ ok: true, photo: { name: safeName, path: uploadPath } });
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
      starter: r.starter,
      main: r.main,
      dessert: r.dessert,
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
        starter: r.plus_one_starter,
        main: r.plus_one_main,
        dessert: r.plus_one_dessert,
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

function publicMenuPayload(row) {
  let kids = [];
  try { kids = JSON.parse(row.kids || "[]"); } catch { kids = []; }
  const hasPlusOne = row.plus_one === "yes" && (row.plus_one_name || "").trim();

  return {
    token: row.token,
    primary: {
      name: row.name || "",
      starter: row.starter || "",
      main: row.main || "",
      dessert: row.dessert || ""
    },
    plusOne: hasPlusOne
      ? {
          name: row.plus_one_name || "",
          starter: row.plus_one_starter || "",
          main: row.plus_one_main || "",
          dessert: row.plus_one_dessert || ""
        }
      : null,
    kidsCount: kids.length
  };
}

function findRsvpForLookup(contact) {
  const trimmed = String(contact || "").trim();
  if (!trimmed) return null;

  const rows = selectAttendingRsvps.all();
  const isEmail = trimmed.includes("@");

  if (isEmail) {
    const lower = trimmed.toLowerCase();
    return rows.find((row) => (row.email || "").trim().toLowerCase() === lower) || null;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  const tail = digits.slice(-9);
  return (
    rows.find((row) => {
      const rowDigits = String(row.phone || "").replace(/\D/g, "");
      if (!rowDigits) return false;
      if (rowDigits === digits) return true;
      return rowDigits.slice(-9) === tail;
    }) || null
  );
}

const insertRsvpAdmin = db.prepare(`
  INSERT INTO rsvps (
    submitted_at, language, name, email, phone, attendance, events,
    menu, starter, main, dessert,
    transfer, dietary, notes,
    plus_one, plus_one_name, plus_one_menu, plus_one_starter, plus_one_main, plus_one_dessert,
    arrival_datetime, arrival_location, return_datetime, return_location, transfer_party_size,
    kids, token
  ) VALUES (
    @submittedAt, @language, @name, @email, @phone, @attendance, @events,
    '', '', '', '',
    @transfer, @dietary, @notes,
    @plusOne, @plusOneName, '', '', '', '',
    @arrivalDateTime, @arrivalLocation, @returnDateTime, @returnLocation, @transferPartySize,
    @kids, @token
  )
`);

app.post("/api/private/rsvps", requireBoardAuth, (req, res) => {
  const name = (req.body.name || "").trim();
  if (!name) {
    res.status(400).json({ error: "Name is required." });
    return;
  }

  const token = crypto.randomUUID();
  const kids = Array.isArray(req.body.kids)
    ? req.body.kids.slice(0, 3).filter((k) => (k?.name || "").trim())
    : [];

  const result = insertRsvpAdmin.run({
    submittedAt: new Date().toISOString(),
    language: req.body.language || "en",
    name,
    email: (req.body.email || "").trim(),
    phone: (req.body.phone || "").trim(),
    attendance: req.body.attendance || "yes",
    events: req.body.events || "",
    transfer: req.body.transfer || "",
    dietary: (req.body.dietary || "").trim(),
    notes: (req.body.notes || "").trim(),
    plusOne: req.body.plus_one || "no",
    plusOneName: (req.body.plus_one_name || "").trim(),
    arrivalDateTime: (req.body.arrival_datetime || "").trim(),
    arrivalLocation: (req.body.arrival_location || "").trim(),
    returnDateTime: (req.body.return_datetime || "").trim(),
    returnLocation: (req.body.return_location || "").trim(),
    transferPartySize: (req.body.transfer_party_size || "").trim(),
    kids: JSON.stringify(kids),
    token,
  });

  res.status(201).json({ ok: true, id: result.lastInsertRowid, token });
});

const selectRsvpById = db.prepare("SELECT * FROM rsvps WHERE id = ?");
const updateRsvpMenuById = db.prepare(`
  UPDATE rsvps
  SET
    starter = @starter,
    main = @main,
    dessert = @dessert,
    menu = @menu,
    plus_one_starter = @plusOneStarter,
    plus_one_main = @plusOneMain,
    plus_one_dessert = @plusOneDessert,
    plus_one_menu = @plusOneMenu
  WHERE id = @id
`);

app.put("/api/private/menu/:rsvpId", requireBoardAuth, (req, res) => {
  const rsvpId = Number(req.params.rsvpId);
  if (!Number.isInteger(rsvpId)) {
    res.status(400).json({ error: "Invalid id." });
    return;
  }

  const row = selectRsvpById.get(rsvpId);
  if (!row) {
    res.status(404).json({ error: "Not found." });
    return;
  }

  const primary = req.body.primary || {};
  const hasPlusOne = row.plus_one === "yes" && (row.plus_one_name || "").trim();
  const plusOne = hasPlusOne ? req.body.plusOne || {} : null;

  const next = {
    starter: primary.starter ?? row.starter ?? "",
    main: primary.main ?? row.main ?? "",
    dessert: primary.dessert ?? row.dessert ?? "",
    plusOneStarter: hasPlusOne ? plusOne.starter ?? row.plus_one_starter ?? "" : "",
    plusOneMain: hasPlusOne ? plusOne.main ?? row.plus_one_main ?? "" : "",
    plusOneDessert: hasPlusOne ? plusOne.dessert ?? row.plus_one_dessert ?? "" : ""
  };

  updateRsvpMenuById.run({
    id: rsvpId,
    starter: next.starter,
    main: next.main,
    dessert: next.dessert,
    menu: [next.starter, next.main, next.dessert].filter(Boolean).join(" | "),
    plusOneStarter: next.plusOneStarter,
    plusOneMain: next.plusOneMain,
    plusOneDessert: next.plusOneDessert,
    plusOneMenu: hasPlusOne
      ? [next.plusOneStarter, next.plusOneMain, next.plusOneDessert].filter(Boolean).join(" | ")
      : ""
  });

  res.json({ ok: true });
});

app.post("/api/menu/lookup", (req, res) => {
  const row = ensureLegacyRsvpToken(findRsvpForLookup(req.body.contact));
  if (!row || !row.token) {
    res.status(404).json({ error: "Not found." });
    return;
  }
  res.json(publicMenuPayload(row));
});

app.get("/api/menu/:token", (req, res) => {
  const row = selectRsvpByToken.get(req.params.token);
  if (!row || row.attendance === "no") {
    res.status(404).json({ error: "Not found." });
    return;
  }
  res.json(publicMenuPayload(row));
});

app.put("/api/menu/:token", (req, res) => {
  const row = selectRsvpByToken.get(req.params.token);
  if (!row || row.attendance === "no") {
    res.status(404).json({ error: "Not found." });
    return;
  }

  const primary = req.body.primary || {};
  if (!primary.starter || !primary.main || !primary.dessert) {
    res.status(400).json({ error: "Menu choice is required." });
    return;
  }

  const hasPlusOne = row.plus_one === "yes" && (row.plus_one_name || "").trim();
  const plusOne = hasPlusOne ? req.body.plusOne || {} : null;
  if (hasPlusOne && (!plusOne.starter || !plusOne.main || !plusOne.dessert)) {
    res.status(400).json({ error: "Menu choice for +1 is required." });
    return;
  }

  updateRsvpMenuByToken.run({
    token: req.params.token,
    starter: primary.starter,
    main: primary.main,
    dessert: primary.dessert,
    menu: [primary.starter, primary.main, primary.dessert].join(" | "),
    plusOneStarter: hasPlusOne ? plusOne.starter : "",
    plusOneMain: hasPlusOne ? plusOne.main : "",
    plusOneDessert: hasPlusOne ? plusOne.dessert : "",
    plusOneMenu: hasPlusOne ? [plusOne.starter, plusOne.main, plusOne.dessert].join(" | ") : ""
  });

  const updated = selectRsvpByToken.get(req.params.token);
  res.json(publicMenuPayload(updated));
});

app.get("/api/country", (req, res) => {
  // In production this is handled by the Cloudflare Pages Function (functions/api/country.js)
  // which reads the CF-IPCountry header. For local dev we fall back to Accept-Language.
  const lang = req.headers["accept-language"] || "";
  const match = lang.match(/[a-z]{2}-([A-Z]{2})/);
  const country = match ? match[1] : "XX";
  res.json({ country });
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
