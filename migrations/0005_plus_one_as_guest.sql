-- Add link column for +1 guests
ALTER TABLE guests ADD COLUMN primary_guest_id INTEGER REFERENCES guests(id);

-- Promote existing +1 names into proper guest rows
INSERT INTO guests (submitted_at, language, name, primary_guest_id)
SELECT g.submitted_at, g.language, g.plus_one_name, g.id
FROM guests g
WHERE g.plus_one = 'yes' AND g.plus_one_name IS NOT NULL AND g.plus_one_name != '';

-- Create menu rows for the newly inserted +1 guests
INSERT INTO guest_menus (guest_id, menu)
SELECT new_g.id, gm.plus_one_menu
FROM guests new_g
JOIN guests primary_g ON new_g.primary_guest_id = primary_g.id
JOIN guest_menus gm ON gm.guest_id = primary_g.id
WHERE new_g.primary_guest_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM guest_menus WHERE guest_id = new_g.id);
