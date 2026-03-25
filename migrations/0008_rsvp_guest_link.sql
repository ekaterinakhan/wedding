-- Add missing fields to rsvps (raw capture table)
ALTER TABLE rsvps ADD COLUMN token TEXT;
ALTER TABLE rsvps ADD COLUMN kids TEXT; -- JSON array of {name, dietary}

-- Link guests back to their rsvp submission
ALTER TABLE guests ADD COLUMN rsvp_id INTEGER REFERENCES rsvps(id);

-- Link existing primary guests (IDs match from original migration)
UPDATE guests
SET rsvp_id = id
WHERE guest_type = 'primary'
  AND id IN (SELECT id FROM rsvps);

-- Link +1 and child guests via their primary guest's rsvp_id
UPDATE guests
SET rsvp_id = (
  SELECT pg.rsvp_id FROM guests pg WHERE pg.id = guests.primary_guest_id
)
WHERE guest_type IN ('plus_one', 'child');
