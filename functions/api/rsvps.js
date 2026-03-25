export async function onRequestPost(context) {
  const { DB } = context.env;

  let body;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON." }, 400);
  }

  const name = (body.name || "").trim();
  const email = (body.email || "").trim();

  if (!name || !email) {
    return jsonResponse({ error: "Name and email are required." }, 400);
  }

  const payload = {
    submitted_at: body.submittedAt || new Date().toISOString(),
    language: body.language || "",
    name,
    email,
    phone: (body.phone || "").trim(),
    attendance: body.attendance || "",
    events: body.events || "",
    menu: body.menu || "",
    transfer: body.transfer || "",
    dietary: (body.dietary || "").trim(),
    notes: (body.notes || "").trim(),
    plus_one: body.plusOne || "",
    plus_one_name: (body.plusOneName || "").trim(),
    plus_one_menu: body.plusOneMenu || "",
  };

  const result = await DB.prepare(`
    INSERT INTO rsvps (
      submitted_at, language, name, email, phone,
      attendance, events, menu, transfer, dietary, notes,
      plus_one, plus_one_name, plus_one_menu
    ) VALUES (
      ?1, ?2, ?3, ?4, ?5,
      ?6, ?7, ?8, ?9, ?10, ?11,
      ?12, ?13, ?14
    )
  `).bind(
    payload.submitted_at,
    payload.language,
    payload.name,
    payload.email,
    payload.phone,
    payload.attendance,
    payload.events,
    payload.menu,
    payload.transfer,
    payload.dietary,
    payload.notes,
    payload.plus_one,
    payload.plus_one_name,
    payload.plus_one_menu,
  ).run();

  return jsonResponse({ ok: true, id: result.meta.last_row_id }, 201);
}

export async function onRequestGet(context) {
  const { DB } = context.env;

  const { results } = await DB.prepare(`
    SELECT * FROM rsvps ORDER BY submitted_at DESC, id DESC
  `).all();

  return jsonResponse(results);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
