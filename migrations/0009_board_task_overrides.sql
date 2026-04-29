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
