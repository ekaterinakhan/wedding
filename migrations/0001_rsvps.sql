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
  notes TEXT,
  plus_one TEXT,
  plus_one_name TEXT,
  plus_one_menu TEXT
);
