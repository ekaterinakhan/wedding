ALTER TABLE guests ADD COLUMN guest_type TEXT NOT NULL DEFAULT 'primary';
UPDATE guests SET guest_type = 'plus_one' WHERE primary_guest_id IS NOT NULL;
