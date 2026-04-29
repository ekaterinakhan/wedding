const SESSION_COOKIE = "private_board_auth";

async function sessionToken(password) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("admin-session"),
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function parseCookies(header) {
  return Object.fromEntries(
    String(header || "")
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const [k, ...rest] = p.split("=");
        return [k, decodeURIComponent(rest.join("="))];
      }),
  );
}

async function isAuthenticated(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const cookies = parseCookies(request.headers.get("Cookie"));
  const expected = await sessionToken(env.ADMIN_PASSWORD);
  return cookies[SESSION_COOKIE] === expected;
}

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

    const publicRsvpMatch = url.pathname.match(/^\/api\/rsvps\/([^/]+)$/);
    if (publicRsvpMatch) {
      const [, token] = publicRsvpMatch;
      if (request.method === "GET") return handlePublicRsvpGet(env, token);
      if (request.method === "PUT") return handlePublicRsvpPut(request, env, token);
    }

    if (url.pathname === "/api/rsvps/recover" && request.method === "POST") {
      return handlePublicRsvpRecover(request, env);
    }

    if (url.pathname === "/api/private/session") {
      const authenticated = await isAuthenticated(request, env);
      return Response.json({ authenticated });
    }

    if (url.pathname === "/api/private/login" && request.method === "POST") {
      if (!env.ADMIN_PASSWORD) {
        return Response.json({ error: "Admin not configured." }, { status: 503 });
      }
      let body;
      try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
      if ((body.password || "") !== env.ADMIN_PASSWORD) {
        return Response.json({ error: "Invalid password." }, { status: 401 });
      }
      const token = await sessionToken(env.ADMIN_PASSWORD);
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}; Secure`,
        },
      });
    }

    if (url.pathname === "/api/private/logout" && request.method === "POST") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0; Secure`,
        },
      });
    }

    if (url.pathname === "/api/private/rsvps") {
      if (!(await isAuthenticated(request, env))) {
        return Response.json({ error: "Authentication required." }, { status: 401 });
      }
      return handlePrivateRsvps(env);
    }

    if (url.pathname.startsWith("/api/private/rsvps/")) {
      if (!(await isAuthenticated(request, env))) {
        return Response.json({ error: "Authentication required." }, { status: 401 });
      }
      const rsvpId = parseInt(url.pathname.slice("/api/private/rsvps/".length), 10);
      if (isNaN(rsvpId)) return Response.json({ error: "Invalid ID." }, { status: 400 });
      if (request.method === "DELETE") return handleDeleteFamily(env, rsvpId);
      if (request.method === "PUT") return handleUpdateFamily(request, env, rsvpId);
      return Response.json({ error: "Method not allowed." }, { status: 405 });
    }

    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      url.pathname = "/index.html";
      return env.ASSETS.fetch(url.toString());
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

  const attendance = body.attendance || "";
  if (attendance !== "no") {
    if (!body.starter || !body.main || !body.dessert) {
      return Response.json({ error: "Menu choice is required." }, { status: 400 });
    }
    if (body.plusOne === "yes" && (!body.plusOneStarter || !body.plusOneMain || !body.plusOneDessert)) {
      return Response.json({ error: "Menu choice for +1 is required." }, { status: 400 });
    }
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
      attendance, events, menu, starter, main, dessert, transfer, dietary, notes,
      plus_one, plus_one_name, plus_one_menu, plus_one_starter, plus_one_main, plus_one_dessert,
      arrival_datetime, arrival_location, return_datetime, return_location, transfer_party_size,
      token, kids
    ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24,?25,?26,?27)
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
    body.starter || "",
    body.main || "",
    body.dessert || "",
    body.transfer || "",
    (body.dietary || "").trim(),
    (body.notes || "").trim(),
    body.plusOne || "",
    plusOneName,
    body.plusOneMenu || "",
    body.plusOneStarter || "",
    body.plusOneMain || "",
    body.plusOneDessert || "",
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
    env.DB.prepare(`
      INSERT INTO guest_menus (guest_id, menu, starter, main, dessert)
      VALUES (?1, ?2, ?3, ?4, ?5)
    `).bind(guestId, body.menu || "", body.starter || "", body.main || "", body.dessert || ""),
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
    await env.DB.prepare(`
      INSERT INTO guest_menus (guest_id, menu, starter, main, dessert)
      VALUES (?1, ?2, ?3, ?4, ?5)
    `)
      .bind(plusOneId, body.plusOneMenu || "", body.plusOneStarter || "", body.plusOneMain || "", body.plusOneDessert || "")
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
      gm.menu, gm.starter, gm.main, gm.dessert,
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

function normalizeKids(kids) {
  return Array.isArray(kids)
    ? kids.slice(0, 3).filter((kid) => (kid?.name || "").trim()).map((kid) => ({
        name: String(kid.name || "").trim(),
        dietary: String(kid.dietary || "").trim(),
      }))
    : [];
}

function publicRsvpPayloadFromRow(row) {
  let kids = [];
  try {
    kids = JSON.parse(row.kids || "[]");
  } catch {
    kids = [];
  }

  return {
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
    token: row.token || "",
  };
}

async function handlePublicRsvpGet(env, token) {
  const row = await env.DB.prepare("SELECT * FROM rsvps WHERE token = ?1 LIMIT 1").bind(token).first();
  if (!row) {
    return Response.json({ error: "RSVP not found." }, { status: 404 });
  }
  return Response.json(publicRsvpPayloadFromRow(row));
}

async function handlePublicRsvpRecover(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const email = (body.email || "").trim();
  if (!email) {
    return Response.json({ error: "Email is required." }, { status: 400 });
  }

  const row = await env.DB.prepare(
    "SELECT * FROM rsvps WHERE lower(email) = lower(?1) ORDER BY submitted_at DESC LIMIT 1"
  ).bind(email).first();

  if (!row || !row.token) {
    return Response.json({ error: "RSVP not found." }, { status: 404 });
  }

  return Response.json(publicRsvpPayloadFromRow(row));
}

async function handlePublicRsvpPut(request, env, token) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const row = await env.DB.prepare("SELECT * FROM rsvps WHERE token = ?1 LIMIT 1").bind(token).first();
  if (!row) {
    return Response.json({ error: "RSVP not found." }, { status: 404 });
  }

  const name = (body.name || row.name || "").trim();
  const email = (body.email || row.email || "").trim();
  const plusOneName = (body.plusOneName || row.plus_one_name || "").trim();
  const attendance = body.attendance || row.attendance || "";
  const kids = normalizeKids(body.kids);

  if (!name || !email) {
    return Response.json({ error: "Name and email are required." }, { status: 400 });
  }

  if (attendance !== "no") {
    if (!body.starter || !body.main || !body.dessert) {
      return Response.json({ error: "Menu choice is required." }, { status: 400 });
    }
    if (body.plusOne === "yes" && (!body.plusOneStarter || !body.plusOneMain || !body.plusOneDessert)) {
      return Response.json({ error: "Menu choice for +1 is required." }, { status: 400 });
    }
  }

  await env.DB.prepare(`
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
    body.language || row.language || "",
    name,
    email,
    (body.phone || row.phone || "").trim(),
    attendance,
    body.events || row.events || "",
    body.menu || "",
    body.starter || "",
    body.main || "",
    body.dessert || "",
    body.transfer || "",
    (body.dietary || "").trim(),
    (body.notes || row.notes || "").trim(),
    body.plusOne || "",
    plusOneName,
    body.plusOneMenu || "",
    body.plusOneStarter || "",
    body.plusOneMain || "",
    body.plusOneDessert || "",
    (body.arrivalDateTime || "").trim(),
    (body.arrivalLocation || "").trim(),
    (body.returnDateTime || "").trim(),
    (body.returnLocation || "").trim(),
    (body.transferPartySize || "").trim(),
    JSON.stringify(kids),
  ).run();

  const primaryGuest = await env.DB.prepare(
    "SELECT id, rsvp_id FROM guests WHERE token = ?1 AND guest_type = 'primary' LIMIT 1"
  ).bind(token).first();

  if (primaryGuest) {
    await env.DB.prepare(`
      UPDATE guests
      SET name = ?1, email = ?2, phone = ?3, attendance = ?4, events = ?5, plus_one = ?6, plus_one_name = ?7, dietary = ?8, notes = ?9
      WHERE id = ?10
    `).bind(
      name,
      email,
      (body.phone || row.phone || "").trim(),
      attendance,
      body.events || row.events || "",
      body.plusOne || "",
      plusOneName,
      (body.dietary || "").trim(),
      (body.notes || row.notes || "").trim(),
      primaryGuest.id,
    ).run();

    await env.DB.prepare(`
      UPDATE guest_menus
      SET menu = ?1, starter = ?2, main = ?3, dessert = ?4
      WHERE guest_id = ?5
    `).bind(body.menu || "", body.starter || "", body.main || "", body.dessert || "", primaryGuest.id).run();

    await env.DB.prepare("DELETE FROM guest_transfers WHERE guest_id = ?1").bind(primaryGuest.id).run();
    await env.DB.prepare(`
      INSERT INTO guest_transfers (guest_id, needs_transfer, arrival_datetime, arrival_location, return_datetime, return_location, party_size)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    `).bind(
      primaryGuest.id,
      body.transfer || "",
      (body.arrivalDateTime || "").trim(),
      (body.arrivalLocation || "").trim(),
      (body.returnDateTime || "").trim(),
      (body.returnLocation || "").trim(),
      (body.transferPartySize || "").trim(),
    ).run();

    const existingPlusOne = await env.DB.prepare(
      "SELECT id FROM guests WHERE rsvp_id = ?1 AND guest_type = 'plus_one' LIMIT 1"
    ).bind(primaryGuest.rsvp_id).first();

    if (body.plusOne === "yes" && plusOneName) {
      if (existingPlusOne) {
        await env.DB.prepare("UPDATE guests SET name = ?1 WHERE id = ?2").bind(plusOneName, existingPlusOne.id).run();
        await env.DB.prepare(`
          UPDATE guest_menus
          SET menu = ?1, starter = ?2, main = ?3, dessert = ?4
          WHERE guest_id = ?5
        `).bind(body.plusOneMenu || "", body.plusOneStarter || "", body.plusOneMain || "", body.plusOneDessert || "", existingPlusOne.id).run();
      } else {
        const plusOneInsert = await env.DB.prepare(`
          INSERT INTO guests (submitted_at, language, name, primary_guest_id, guest_type, rsvp_id)
          VALUES (?1, ?2, ?3, ?4, 'plus_one', ?5)
          RETURNING id
        `).bind(row.submitted_at, body.language || row.language || "", plusOneName, primaryGuest.id, primaryGuest.rsvp_id).first();
        await env.DB.prepare(`
          INSERT INTO guest_menus (guest_id, menu, starter, main, dessert)
          VALUES (?1, ?2, ?3, ?4, ?5)
        `).bind(plusOneInsert.id, body.plusOneMenu || "", body.plusOneStarter || "", body.plusOneMain || "", body.plusOneDessert || "").run();
      }
    } else if (existingPlusOne) {
      await env.DB.prepare("DELETE FROM guest_menus WHERE guest_id = ?1").bind(existingPlusOne.id).run();
      await env.DB.prepare("DELETE FROM guests WHERE id = ?1").bind(existingPlusOne.id).run();
    }

    const { results: childGuests } = await env.DB.prepare(
      "SELECT id FROM guests WHERE rsvp_id = ?1 AND guest_type = 'child'"
    ).bind(primaryGuest.rsvp_id).all();

    if (childGuests.length > 0) {
      await env.DB.batch(
        childGuests.flatMap((child) => [
          env.DB.prepare("DELETE FROM guest_menus WHERE guest_id = ?1").bind(child.id),
          env.DB.prepare("DELETE FROM guest_transfers WHERE guest_id = ?1").bind(child.id),
          env.DB.prepare("DELETE FROM guests WHERE id = ?1").bind(child.id),
        ])
      );
    }

    if (kids.length > 0) {
      await env.DB.batch(
        kids.map((kid) =>
          env.DB.prepare(`
            INSERT INTO guests (submitted_at, language, name, dietary, primary_guest_id, guest_type, rsvp_id)
            VALUES (?1, ?2, ?3, ?4, ?5, 'child', ?6)
          `).bind(row.submitted_at, body.language || row.language || "", kid.name, kid.dietary, primaryGuest.id, primaryGuest.rsvp_id)
        )
      );
    }
  }

  return Response.json({ ok: true, token });
}

async function handleDeleteFamily(env, rsvpId) {
  const { results: guests } = await env.DB.prepare(
    "SELECT id FROM guests WHERE rsvp_id = ?1"
  ).bind(rsvpId).all();

  if (guests.length > 0) {
    const deletions = guests.flatMap(g => [
      env.DB.prepare("DELETE FROM guest_menus WHERE guest_id = ?1").bind(g.id),
      env.DB.prepare("DELETE FROM guest_transfers WHERE guest_id = ?1").bind(g.id),
    ]);
    await env.DB.batch(deletions);
  }

  await env.DB.batch([
    env.DB.prepare("DELETE FROM guests WHERE rsvp_id = ?1").bind(rsvpId),
    env.DB.prepare("DELETE FROM rsvps WHERE id = ?1").bind(rsvpId),
  ]);

  return Response.json({ ok: true });
}

async function handleUpdateFamily(request, env, rsvpId) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }

  const primary = await env.DB.prepare(
    "SELECT id FROM guests WHERE rsvp_id = ?1 AND guest_type = 'primary'"
  ).bind(rsvpId).first();

  if (!primary) return Response.json({ error: "Not found." }, { status: 404 });

  const guestId = primary.id;

  let plusOneId = null;
  if (body.plus_one_name !== undefined) {
    const plusOne = await env.DB.prepare(
      "SELECT id FROM guests WHERE rsvp_id = ?1 AND guest_type = 'plus_one'"
    ).bind(rsvpId).first();
    if (plusOne) plusOneId = plusOne.id;
  }

  const statements = [
    env.DB.prepare(`
      UPDATE guests SET name=?1, email=?2, phone=?3, attendance=?4, events=?5, dietary=?6, notes=?7
      WHERE id=?8
    `).bind(
      (body.name || "").trim(), (body.email || "").trim(), (body.phone || "").trim(),
      body.attendance || "", body.events || "",
      (body.dietary || "").trim(), (body.notes || "").trim(), guestId
    ),
    env.DB.prepare("UPDATE guest_menus SET menu=?1 WHERE guest_id=?2")
      .bind(body.menu || "", guestId),
    env.DB.prepare("DELETE FROM guest_transfers WHERE guest_id=?1").bind(guestId),
    env.DB.prepare(`
      INSERT INTO guest_transfers (guest_id, needs_transfer, arrival_datetime, arrival_location, return_datetime, return_location, party_size)
      VALUES (?1,?2,?3,?4,?5,?6,?7)
    `).bind(
      guestId, body.transfer || "",
      (body.arrival_datetime || "").trim(), (body.arrival_location || "").trim(),
      (body.return_datetime || "").trim(), (body.return_location || "").trim(),
      (body.transfer_party_size || "").trim()
    ),
  ];

  if (plusOneId) {
    statements.push(
      env.DB.prepare("UPDATE guests SET name=?1 WHERE id=?2")
        .bind((body.plus_one_name || "").trim(), plusOneId)
    );
    if (body.plus_one_menu !== undefined) {
      statements.push(
        env.DB.prepare("UPDATE guest_menus SET menu=?1 WHERE guest_id=?2")
          .bind(body.plus_one_menu || "", plusOneId)
      );
    }
  }

  if (Array.isArray(body.children)) {
    for (const child of body.children) {
      if (!child.id) continue;
      statements.push(
        env.DB.prepare("UPDATE guests SET name=?1, dietary=?2 WHERE id=?3 AND rsvp_id=?4")
          .bind((child.name || "").trim(), (child.dietary || "").trim(), child.id, rsvpId)
      );
    }
  }

  await env.DB.batch(statements);
  return Response.json({ ok: true });
}

async function handlePrivateRsvps(env) {
  const { results } = await env.DB.prepare(`
    SELECT
      g.id,
      g.submitted_at,
      g.name,
      g.email,
      g.phone,
      g.attendance,
      g.events,
      g.dietary,
      g.notes,
      g.guest_type,
      g.primary_guest_id,
      g.rsvp_id,
      gm.menu,
      gm.starter,
      gm.main,
      gm.dessert,
      gt.needs_transfer AS transfer,
      gt.arrival_datetime,
      gt.arrival_location,
      gt.return_datetime,
      gt.return_location,
      gt.party_size AS transfer_party_size
    FROM guests g
    LEFT JOIN guest_menus gm ON gm.guest_id = g.id
    LEFT JOIN guest_transfers gt ON gt.guest_id = g.id
    ORDER BY COALESCE(g.primary_guest_id, g.id), g.primary_guest_id IS NOT NULL, g.id
  `).all();
  return Response.json(results);
}
