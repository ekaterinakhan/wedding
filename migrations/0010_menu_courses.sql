ALTER TABLE rsvps ADD COLUMN starter TEXT;
ALTER TABLE rsvps ADD COLUMN main TEXT;
ALTER TABLE rsvps ADD COLUMN dessert TEXT;
ALTER TABLE rsvps ADD COLUMN plus_one_starter TEXT;
ALTER TABLE rsvps ADD COLUMN plus_one_main TEXT;
ALTER TABLE rsvps ADD COLUMN plus_one_dessert TEXT;

ALTER TABLE guest_menus ADD COLUMN starter TEXT;
ALTER TABLE guest_menus ADD COLUMN main TEXT;
ALTER TABLE guest_menus ADD COLUMN dessert TEXT;
