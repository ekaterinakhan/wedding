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
    "SELECT id FROM rsvps WHERE lower(email) = lower(?1) LIMIT 1"
  ).bind(email).first();

  if (existing) {
    return Response.json({ duplicate: true }, { status: 409 });
  }

  const result = await env.DB.prepare(`
    INSERT INTO rsvps (
      submitted_at, language, name, email, phone,
      attendance, events, menu, transfer, dietary, notes,
      plus_one, plus_one_name, plus_one_menu,
      arrival_datetime, arrival_location, return_datetime, return_location, transfer_party_size
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)
  `).bind(
    body.submittedAt || new Date().toISOString(),
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
    (body.plusOneName || "").trim(),
    body.plusOneMenu || "",
    (body.arrivalDateTime || "").trim(),
    (body.arrivalLocation || "").trim(),
    (body.returnDateTime || "").trim(),
    (body.returnLocation || "").trim(),
    (body.transferPartySize || "").trim(),
  ).run();

  return Response.json({ ok: true, id: result.meta.last_row_id }, { status: 201 });
}

async function handleRsvpGet(env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM rsvps ORDER BY submitted_at DESC, id DESC"
  ).all();
  return Response.json(results);
}
