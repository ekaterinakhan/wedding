import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import express from "express";

const app = express();
const port = Number(process.env.PORT || 8787);
const dbDir = path.join(process.cwd(), "data");
const dbPath = path.join(dbDir, "rsvps.sqlite");

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
  )
`);

const insertRsvp = db.prepare(`
  INSERT INTO rsvps (
    submitted_at, language, name, email, phone, attendance, events, menu, transfer, dietary, notes
  ) VALUES (
    @submittedAt, @language, @name, @email, @phone, @attendance, @events, @menu, @transfer, @dietary, @notes
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
    notes
  FROM rsvps
  ORDER BY datetime(submitted_at) DESC, id DESC
`);

app.use(express.json());

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
    notes: (req.body.notes || "").trim()
  };

  if (!payload.name || !payload.email) {
    res.status(400).json({ error: "Name and email are required." });
    return;
  }

  const result = insertRsvp.run(payload);
  res.status(201).json({ ok: true, id: result.lastInsertRowid });
});

app.get("/api/rsvps", (_req, res) => {
  res.json(selectRsvps.all());
});

app.get("/responses", (_req, res) => {
  const rows = selectRsvps.all();

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

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
          body {
            margin: 0;
            font-family: ui-sans-serif, system-ui, sans-serif;
            background: #f7efe2;
            color: #2a211c;
          }
          .page {
            max-width: 1400px;
            margin: 32px auto;
            padding: 0 20px;
          }
          h1 {
            margin: 0 0 8px;
            font-size: 2rem;
          }
          p {
            margin: 0 0 20px;
            color: #6a5a51;
          }
          .card {
            overflow: auto;
            border: 1px solid rgba(71, 46, 31, 0.12);
            border-radius: 20px;
            background: rgba(255, 250, 243, 0.92);
            box-shadow: 0 24px 80px rgba(72, 40, 23, 0.1);
          }
          table {
            width: 100%;
            border-collapse: collapse;
            min-width: 1100px;
          }
          th, td {
            padding: 14px 16px;
            text-align: left;
            vertical-align: top;
            border-bottom: 1px solid rgba(71, 46, 31, 0.1);
          }
          th {
            position: sticky;
            top: 0;
            background: #fff7ec;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #5d3426;
          }
          tr:last-child td {
            border-bottom: 0;
          }
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
});
