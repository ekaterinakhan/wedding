export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/country") {
      const country = request.cf?.country || "XX";
      return Response.json({ country });
    }

    if (url.pathname === "/api/rsvps") {
      if (request.method === "POST") {
        return handleRsvpPost(request, env);
      }
      if (request.method === "GET") {
        return handleRsvpGet(env);
      }
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

  const existing = await env.DB.prepare(
    "SELECT id, token FROM guests WHERE lower(email) = lower(?1) LIMIT 1"
  ).bind(email).first();

  if (existing) {
    return Response.json({ duplicate: true, token: existing.token }, { status: 409 });
  }

  const token = crypto.randomUUID();

  // Insert guest
  const guest = await env.DB.prepare(`
    INSERT INTO guests (submitted_at, language, name, email, phone, attendance, events, plus_one, plus_one_name, dietary, notes, token)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
    RETURNING id
  `).bind(
    body.submittedAt || new Date().toISOString(),
    body.language || "",
    name,
    email,
    (body.phone || "").trim(),
    body.attendance || "",
    body.events || "",
    body.plusOne || "",
    (body.plusOneName || "").trim(),
    (body.dietary || "").trim(),
    (body.notes || "").trim(),
    token,
  ).first();

  const guestId = guest.id;

  // Insert menu + transfer in parallel
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO guest_menus (guest_id, menu, plus_one_menu) VALUES (?1, ?2, ?3)
    `).bind(guestId, body.menu || "", body.plusOneMenu || ""),

    env.DB.prepare(`
      INSERT INTO guest_transfers (guest_id, needs_transfer, arrival_datetime, arrival_location, return_datetime, return_location, party_size)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    `).bind(
      guestId,
      body.transfer || "",
      (body.arrivalDateTime || "").trim(),
      (body.arrivalLocation || "").trim(),
      (body.returnDateTime || "").trim(),
      (body.returnLocation || "").trim(),
      (body.transferPartySize || "").trim(),
    ),
  ]);

  return Response.json({ ok: true, id: guestId, token }, { status: 201 });
}

async function handleRsvpGet(env) {
  const { results } = await env.DB.prepare(`
    SELECT
      g.id, g.submitted_at, g.language, g.name, g.email, g.phone,
      g.attendance, g.events, g.plus_one, g.plus_one_name, g.dietary, g.notes,
      gm.menu, gm.plus_one_menu,
      gt.needs_transfer, gt.arrival_datetime, gt.arrival_location,
      gt.return_datetime, gt.return_location, gt.party_size
    FROM guests g
    LEFT JOIN guest_menus gm ON gm.guest_id = g.id
    LEFT JOIN guest_transfers gt ON gt.guest_id = g.id
    ORDER BY g.submitted_at DESC, g.id DESC
  `).all();
  return Response.json(results);
}
