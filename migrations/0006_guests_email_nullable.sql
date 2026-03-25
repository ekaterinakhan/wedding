PRAGMA foreign_keys = OFF;

-- Recreate guests table with email nullable (required for +1 guests who have no email)
CREATE TABLE guests_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submitted_at TEXT NOT NULL,
  language TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  attendance TEXT,
  events TEXT,
  plus_one TEXT,
  plus_one_name TEXT,
  dietary TEXT,
  notes TEXT,
  token TEXT,
  primary_guest_id INTEGER REFERENCES guests_new(id)
);

INSERT INTO guests_new SELECT * FROM guests;

DROP TABLE guests;

ALTER TABLE guests_new RENAME TO guests;

PRAGMA foreign_keys = ON;
