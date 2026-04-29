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
    starter: body.starter || "",
    main: body.main || "",
    dessert: body.dessert || "",
    transfer: body.transfer || "",
    dietary: (body.dietary || "").trim(),
    notes: (body.notes || "").trim(),
    plus_one: body.plusOne || "",
    plus_one_name: (body.plusOneName || "").trim(),
    plus_one_menu: body.plusOneMenu || "",
    plus_one_starter: body.plusOneStarter || "",
    plus_one_main: body.plusOneMain || "",
    plus_one_dessert: body.plusOneDessert || "",
  };

  const result = await DB.prepare(`
    INSERT INTO rsvps (
      submitted_at, language, name, email, phone,
      attendance, events, menu, starter, main, dessert, transfer, dietary, notes,
      plus_one, plus_one_name, plus_one_menu, plus_one_starter, plus_one_main, plus_one_dessert
    ) VALUES (
      ?1, ?2, ?3, ?4, ?5,
      ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
      ?15, ?16, ?17, ?18, ?19, ?20
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
    payload.starter,
    payload.main,
    payload.dessert,
    payload.transfer,
    payload.dietary,
    payload.notes,
    payload.plus_one,
    payload.plus_one_name,
    payload.plus_one_menu,
    payload.plus_one_starter,
    payload.plus_one_main,
    payload.plus_one_dessert,
  ).run();

  return jsonResponse({ ok: true, id: result.meta.last_row_id }, 201);
}

export async function onRequestGet(context) {
  const { DB } = context.env;
  const url = new URL(context.request.url);
  const token = url.pathname.split("/").filter(Boolean).at(-1);

  if (token && token !== "rsvps") {
    const row = await DB.prepare("SELECT * FROM rsvps WHERE token = ?1 LIMIT 1").bind(token).first();
    if (!row) {
      return jsonResponse({ error: "RSVP not found." }, 404);
    }

    let kids = [];
    try { kids = JSON.parse(row.kids || "[]"); } catch { kids = []; }

    return jsonResponse({
      name: row.name || "",
      email: row.email || "",
      phone: row.phone || "",
      language: row.language || "",
      attendance: row.attendance || "",
      events: row.events || "",
      menu: row.menu || "",
      starter: row.starter || "",
      main: row.main || "",
      dessert: row.dessert || "",
      transfer: row.transfer || "",
      dietary: row.dietary || "",
      notes: row.notes || "",
      plusOne: row.plus_one || "",
      plusOneName: row.plus_one_name || "",
      plusOneMenu: row.plus_one_menu || "",
      plusOneStarter: row.plus_one_starter || "",
      plusOneMain: row.plus_one_main || "",
      plusOneDessert: row.plus_one_dessert || "",
      arrivalDateTime: row.arrival_datetime || "",
      arrivalLocation: row.arrival_location || "",
      returnDateTime: row.return_datetime || "",
      returnLocation: row.return_location || "",
      transferPartySize: row.transfer_party_size || "",
      kids,
      token: row.token || ""
    });
  }

  const { results } = await DB.prepare(`
    SELECT * FROM rsvps ORDER BY submitted_at DESC, id DESC
  `).all();

  return jsonResponse(results);
}

export async function onRequestPut(context) {
  const { DB } = context.env;
  const url = new URL(context.request.url);
  const token = url.pathname.split("/").filter(Boolean).at(-1);

  if (!token || token === "rsvps") {
    return jsonResponse({ error: "RSVP not found." }, 404);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON." }, 400);
  }

  const row = await DB.prepare("SELECT * FROM rsvps WHERE token = ?1 LIMIT 1").bind(token).first();
  if (!row) {
    return jsonResponse({ error: "RSVP not found." }, 404);
  }

  const payload = {
    language: body.language || row.language || "",
    name: (body.name || row.name || "").trim(),
    email: (body.email || row.email || "").trim(),
    phone: (body.phone || row.phone || "").trim(),
    attendance: body.attendance || row.attendance || "",
    events: body.events || row.events || "",
    menu: body.menu || "",
    starter: body.starter || "",
    main: body.main || "",
    dessert: body.dessert || "",
    transfer: body.transfer || "",
    dietary: (body.dietary || "").trim(),
    notes: (body.notes || row.notes || "").trim(),
    plus_one: body.plusOne || "",
    plus_one_name: (body.plusOneName || row.plus_one_name || "").trim(),
    plus_one_menu: body.plusOneMenu || "",
    plus_one_starter: body.plusOneStarter || "",
    plus_one_main: body.plusOneMain || "",
    plus_one_dessert: body.plusOneDessert || "",
    arrival_datetime: (body.arrivalDateTime || "").trim(),
    arrival_location: (body.arrivalLocation || "").trim(),
    return_datetime: (body.returnDateTime || "").trim(),
    return_location: (body.returnLocation || "").trim(),
    transfer_party_size: (body.transferPartySize || "").trim(),
    kids: JSON.stringify(Array.isArray(body.kids) ? body.kids.slice(0, 3).filter((kid) => (kid?.name || "").trim()) : [])
  };

  await DB.prepare(`
    UPDATE rsvps
    SET
      language = ?2,
      name = ?3,
      email = ?4,
      phone = ?5,
      attendance = ?6,
      events = ?7,
      menu = ?8,
      starter = ?9,
      main = ?10,
      dessert = ?11,
      transfer = ?12,
      dietary = ?13,
      notes = ?14,
      plus_one = ?15,
      plus_one_name = ?16,
      plus_one_menu = ?17,
      plus_one_starter = ?18,
      plus_one_main = ?19,
      plus_one_dessert = ?20,
      arrival_datetime = ?21,
      arrival_location = ?22,
      return_datetime = ?23,
      return_location = ?24,
      transfer_party_size = ?25,
      kids = ?26
    WHERE token = ?1
  `).bind(
    token,
    payload.language,
    payload.name,
    payload.email,
    payload.phone,
    payload.attendance,
    payload.events,
    payload.menu,
    payload.starter,
    payload.main,
    payload.dessert,
    payload.transfer,
    payload.dietary,
    payload.notes,
    payload.plus_one,
    payload.plus_one_name,
    payload.plus_one_menu,
    payload.plus_one_starter,
    payload.plus_one_main,
    payload.plus_one_dessert,
    payload.arrival_datetime,
    payload.arrival_location,
    payload.return_datetime,
    payload.return_location,
    payload.transfer_party_size,
    payload.kids
  ).run();

  return jsonResponse({ ok: true, token });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
