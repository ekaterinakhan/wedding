CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submitted_at TEXT NOT NULL,
  language TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  attendance TEXT,
  events TEXT,
  plus_one TEXT,
  plus_one_name TEXT,
  dietary TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS guest_menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL REFERENCES guests(id),
  menu TEXT,
  plus_one_menu TEXT
);

CREATE TABLE IF NOT EXISTS guest_transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL REFERENCES guests(id),
  needs_transfer TEXT,
  arrival_datetime TEXT,
  arrival_location TEXT,
  return_datetime TEXT,
  return_location TEXT,
  party_size TEXT
);

-- Migrate existing data from flat rsvps table
INSERT INTO guests (id, submitted_at, language, name, email, phone, attendance, events, plus_one, plus_one_name, dietary, notes)
SELECT id, submitted_at, language, name, email, phone, attendance, events, plus_one, plus_one_name, dietary, notes
FROM rsvps;

INSERT INTO guest_menus (guest_id, menu, plus_one_menu)
SELECT id, menu, plus_one_menu
FROM rsvps;

INSERT INTO guest_transfers (guest_id, needs_transfer, arrival_datetime, arrival_location, return_datetime, return_location, party_size)
SELECT id, transfer, arrival_datetime, arrival_location, return_datetime, return_location, transfer_party_size
FROM rsvps;
