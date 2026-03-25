export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/country") {
      const country = request.cf?.country || "XX";
      return Response.json({ country });
    }

    if (url.pathname === "/api/rsvps") {
      if (request.method === "POST") return handleRsvpPost(request, env);
      if (request.method === "GET") return handleRsvpGet(env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleRsvpPost(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const name = (body.name || "").trim();
  const email = (body.email || "").trim();

  if (!name || !email) {
    return Response.json({ error: "Name and email are required." }, { status: 400 });
  }

  // Duplicate check
  const existing = await env.DB.prepare(
    "SELECT id, token FROM guests WHERE lower(email) = lower(?1) LIMIT 1"
  ).bind(email).first();

  if (existing) {
    return Response.json({ duplicate: true, token: existing.token }, { status: 409 });
  }

  const token = crypto.randomUUID();
  const submittedAt = body.submittedAt || new Date().toISOString();
  const kids = Array.isArray(body.kids) ? body.kids.slice(0, 3).filter((k) => (k.name || "").trim()) : [];
  const plusOneName = (body.plusOneName || "").trim();
  const hasPlusOne = body.plusOne === "yes" && plusOneName;

  // 1. Insert raw RSVP snapshot — full form data preserved regardless of normalization
  const rsvp = await env.DB.prepare(`
    INSERT INTO rsvps (
      submitted_at, language, name, email, phone,
      attendance, events, menu, transfer, dietary, notes,
      plus_one, plus_one_name, plus_one_menu,
      arrival_datetime, arrival_location, return_datetime, return_location, transfer_party_size,
      token, kids
    ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21)
    RETURNING id
  `).bind(
    submittedAt,
    body.language || "",
    name,
    email,
    (body.phone || "").trim(),
    body.attendance || "",
    body.events || "",
    body.menu || "",
    body.transfer || "",
    (body.dietary || "").trim(),
    (body.notes || "").trim(),
    body.plusOne || "",
    plusOneName,
    body.plusOneMenu || "",
    (body.arrivalDateTime || "").trim(),
    (body.arrivalLocation || "").trim(),
    (body.returnDateTime || "").trim(),
    (body.returnLocation || "").trim(),
    (body.transferPartySize || "").trim(),
    token,
    kids.length > 0 ? JSON.stringify(kids) : null,
  ).first();

  const rsvpId = rsvp.id;

  // 2. Insert primary guest
  const guest = await env.DB.prepare(`
    INSERT INTO guests (submitted_at, language, name, email, phone, attendance, events, plus_one, plus_one_name, dietary, notes, token, guest_type, rsvp_id)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,'primary',?13)
    RETURNING id
  `).bind(
    submittedAt, body.language || "", name, email,
    (body.phone || "").trim(), body.attendance || "", body.events || "",
    body.plusOne || "", plusOneName,
    (body.dietary || "").trim(), (body.notes || "").trim(),
    token, rsvpId,
  ).first();

  const guestId = guest.id;

  // 3. Insert primary menu + transfer in parallel
  const statements = [
    env.DB.prepare(`INSERT INTO guest_menus (guest_id, menu) VALUES (?1, ?2)`)
      .bind(guestId, body.menu || ""),
    env.DB.prepare(`
      INSERT INTO guest_transfers (guest_id, needs_transfer, arrival_datetime, arrival_location, return_datetime, return_location, party_size)
      VALUES (?1,?2,?3,?4,?5,?6,?7)
    `).bind(
      guestId, body.transfer || "",
      (body.arrivalDateTime || "").trim(), (body.arrivalLocation || "").trim(),
      (body.returnDateTime || "").trim(), (body.returnLocation || "").trim(),
      (body.transferPartySize || "").trim(),
    ),
  ];

  // 4. Queue +1 guest insert
  if (hasPlusOne) {
    statements.push(
      env.DB.prepare(`
        INSERT INTO guests (submitted_at, language, name, primary_guest_id, guest_type, rsvp_id)
        VALUES (?1,?2,?3,?4,'plus_one',?5)
        RETURNING id
      `).bind(submittedAt, body.language || "", plusOneName, guestId, rsvpId)
    );
  }

  const batchResults = await env.DB.batch(statements);

  // 5. Insert +1 menu
  if (hasPlusOne) {
    const plusOneId = batchResults[batchResults.length - 1].results[0].id;
    await env.DB.prepare(`INSERT INTO guest_menus (guest_id, menu) VALUES (?1, ?2)`)
      .bind(plusOneId, body.plusOneMenu || "")
      .run();
  }

  // 6. Insert children
  if (kids.length > 0) {
    await env.DB.batch(
      kids.map((k) =>
        env.DB.prepare(`
          INSERT INTO guests (submitted_at, language, name, dietary, primary_guest_id, guest_type, rsvp_id)
          VALUES (?1,?2,?3,?4,?5,'child',?6)
        `).bind(submittedAt, body.language || "", k.name.trim(), (k.dietary || "").trim(), guestId, rsvpId)
      )
    );
  }

  return Response.json({ ok: true, id: guestId, token }, { status: 201 });
}

async function handleRsvpGet(env) {
  const { results } = await env.DB.prepare(`
    SELECT
      g.id, g.submitted_at, g.language, g.name, g.email, g.phone,
      g.attendance, g.events, g.dietary, g.notes,
      g.guest_type, g.primary_guest_id, g.rsvp_id,
      pg.name AS primary_guest_name,
      gm.menu,
      gt.needs_transfer, gt.arrival_datetime, gt.arrival_location,
      gt.return_datetime, gt.return_location, gt.party_size
    FROM guests g
    LEFT JOIN guests pg ON pg.id = g.primary_guest_id
    LEFT JOIN guest_menus gm ON gm.guest_id = g.id
    LEFT JOIN guest_transfers gt ON gt.guest_id = g.id
    ORDER BY COALESCE(g.primary_guest_id, g.id), g.primary_guest_id IS NOT NULL, g.id
  `).all();
  return Response.json(results);
}
