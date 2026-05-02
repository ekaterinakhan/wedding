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

    if (url.pathname === "/api/menu/lookup" && request.method === "POST") {
      return handleMenuLookup(request, env);
    }

    const menuTokenMatch = url.pathname.match(/^\/api\/menu\/([^/]+)$/);
    if (menuTokenMatch) {
      const [, token] = menuTokenMatch;
      if (request.method === "GET") return handleMenuGet(env, token);
      if (request.method === "PUT") return handleMenuPut(request, env, token);
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
      if (request.method === "POST") return handleAdminCreateGuest(request, env);
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

    if (url.pathname.startsWith("/api/private/menu/")) {
      if (!(await isAuthenticated(request, env))) {
        return Response.json({ error: "Authentication required." }, { status: 401 });
      }
      const rsvpId = parseInt(url.pathname.slice("/api/private/menu/".length), 10);
      if (isNaN(rsvpId)) return Response.json({ error: "Invalid ID." }, { status: 400 });
      if (request.method === "PUT") return handleAdminMenuPut(request, env, rsvpId);
      return Response.json({ error: "Method not allowed." }, { status: 405 });
    }

    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      url.pathname = "/index.html";
      return env.ASSETS.fetch(url.toString());
    }

    return env.ASSETS.fetch(request);
  },
};

function publicMenuPayload(row, kidsCount) {
  const hasPlusOne = row.plus_one === "yes" && (row.plus_one_name || "").trim();
  return {
    token: row.token,
    primary: {
      name: row.name || "",
      starter: row.starter || "",
      main: row.main || "",
      dessert: row.dessert || "",
    },
    plusOne: hasPlusOne
      ? {
          name: row.plus_one_name || "",
          starter: row.plus_one_starter || "",
          main: row.plus_one_main || "",
          dessert: row.plus_one_dessert || "",
        }
      : null,
    kidsCount,
  };
}

function rowKidsCount(row) {
  try {
    return JSON.parse(row.kids || "[]").length;
  } catch {
    return 0;
  }
}

async function handleMenuLookup(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }

  const contact = String(body.contact || "").trim();
  if (!contact) {
    return Response.json({ error: "Contact required." }, { status: 400 });
  }

  let row;
  if (contact.includes("@")) {
    row = await env.DB.prepare(
      "SELECT * FROM rsvps WHERE lower(email) = lower(?1) AND attendance != 'no' ORDER BY datetime(submitted_at) DESC, id DESC LIMIT 1"
    ).bind(contact).first();
  } else {
    const digits = contact.replace(/\D/g, "");
    if (!digits) return Response.json({ error: "Not found." }, { status: 404 });
    const tail = digits.slice(-9);
    const { results } = await env.DB.prepare(
      "SELECT * FROM rsvps WHERE phone IS NOT NULL AND phone != '' AND attendance != 'no' ORDER BY datetime(submitted_at) DESC, id DESC"
    ).all();
    row = results.find((r) => {
      const rd = String(r.phone || "").replace(/\D/g, "");
      if (!rd) return false;
      return rd === digits || rd.slice(-9) === tail;
    });
  }

  row = await ensureLegacyRsvpToken(env, row);
  if (!row || !row.token) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  return Response.json(publicMenuPayload(row, rowKidsCount(row)));
}

async function handleMenuGet(env, token) {
  const row = await env.DB.prepare(
    "SELECT * FROM rsvps WHERE token = ?1 AND attendance != 'no' LIMIT 1"
  ).bind(token).first();
  if (!row) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  return Response.json(publicMenuPayload(row, rowKidsCount(row)));
}

async function handleMenuPut(request, env, token) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }

  const row = await env.DB.prepare(
    "SELECT * FROM rsvps WHERE token = ?1 AND attendance != 'no' LIMIT 1"
  ).bind(token).first();
  if (!row) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const primary = body.primary || {};
  if (!primary.starter || !primary.main || !primary.dessert) {
    return Response.json({ error: "Menu choice is required." }, { status: 400 });
  }

  const hasPlusOne = row.plus_one === "yes" && (row.plus_one_name || "").trim();
  const plusOne = hasPlusOne ? body.plusOne || {} : null;
  if (hasPlusOne && (!plusOne.starter || !plusOne.main || !plusOne.dessert)) {
    return Response.json({ error: "Menu choice for +1 is required." }, { status: 400 });
  }

  const primaryMenuSummary = [primary.starter, primary.main, primary.dessert].join(" | ");
  const plusOneMenuSummary = hasPlusOne
    ? [plusOne.starter, plusOne.main, plusOne.dessert].join(" | ")
    : "";

  await env.DB.prepare(`
    UPDATE rsvps
    SET starter = ?2, main = ?3, dessert = ?4, menu = ?5,
        plus_one_starter = ?6, plus_one_main = ?7, plus_one_dessert = ?8, plus_one_menu = ?9
    WHERE token = ?1
  `).bind(
    token,
    primary.starter, primary.main, primary.dessert, primaryMenuSummary,
    hasPlusOne ? plusOne.starter : "",
    hasPlusOne ? plusOne.main : "",
    hasPlusOne ? plusOne.dessert : "",
    plusOneMenuSummary,
  ).run();

  const primaryGuest = await env.DB.prepare(
    "SELECT id, rsvp_id FROM guests WHERE token = ?1 AND guest_type = 'primary' LIMIT 1"
  ).bind(token).first();

  if (primaryGuest) {
    await env.DB.prepare(`
      UPDATE guest_menus
      SET menu = ?1, starter = ?2, main = ?3, dessert = ?4
      WHERE guest_id = ?5
    `).bind(primaryMenuSummary, primary.starter, primary.main, primary.dessert, primaryGuest.id).run();

    if (hasPlusOne) {
      const plusOneGuest = await env.DB.prepare(
        "SELECT id FROM guests WHERE rsvp_id = ?1 AND guest_type = 'plus_one' LIMIT 1"
      ).bind(primaryGuest.rsvp_id).first();

      if (plusOneGuest) {
        await env.DB.prepare(`
          UPDATE guest_menus
          SET menu = ?1, starter = ?2, main = ?3, dessert = ?4
          WHERE guest_id = ?5
        `).bind(plusOneMenuSummary, plusOne.starter, plusOne.main, plusOne.dessert, plusOneGuest.id).run();
      }
    }
  }

  const updated = await env.DB.prepare(
    "SELECT * FROM rsvps WHERE token = ?1 LIMIT 1"
  ).bind(token).first();

  return Response.json(publicMenuPayload(updated, rowKidsCount(updated)));
}

async function handleAdminMenuPut(request, env, rsvpId) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }

  const row = await env.DB.prepare("SELECT * FROM rsvps WHERE id = ?1 LIMIT 1").bind(rsvpId).first();
  if (!row) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const primary = body.primary || {};
  const hasPlusOne = row.plus_one === "yes" && (row.plus_one_name || "").trim();
  const plusOne = hasPlusOne ? body.plusOne || {} : null;

  const next = {
    starter: primary.starter ?? row.starter ?? "",
    main: primary.main ?? row.main ?? "",
    dessert: primary.dessert ?? row.dessert ?? "",
    plusOneStarter: hasPlusOne ? plusOne.starter ?? row.plus_one_starter ?? "" : "",
    plusOneMain: hasPlusOne ? plusOne.main ?? row.plus_one_main ?? "" : "",
    plusOneDessert: hasPlusOne ? plusOne.dessert ?? row.plus_one_dessert ?? "" : "",
  };

  const primaryMenu = [next.starter, next.main, next.dessert].filter(Boolean).join(" | ");
  const plusOneMenu = hasPlusOne
    ? [next.plusOneStarter, next.plusOneMain, next.plusOneDessert].filter(Boolean).join(" | ")
    : "";

  await env.DB.prepare(`
    UPDATE rsvps
    SET starter = ?2, main = ?3, dessert = ?4, menu = ?5,
        plus_one_starter = ?6, plus_one_main = ?7, plus_one_dessert = ?8, plus_one_menu = ?9
    WHERE id = ?1
  `).bind(
    rsvpId,
    next.starter, next.main, next.dessert, primaryMenu,
    next.plusOneStarter, next.plusOneMain, next.plusOneDessert, plusOneMenu,
  ).run();

  const primaryGuest = await env.DB.prepare(
    "SELECT id FROM guests WHERE rsvp_id = ?1 AND guest_type = 'primary' LIMIT 1"
  ).bind(rsvpId).first();

  if (primaryGuest) {
    await env.DB.prepare(`
      UPDATE guest_menus
      SET menu = ?1, starter = ?2, main = ?3, dessert = ?4
      WHERE guest_id = ?5
    `).bind(primaryMenu, next.starter, next.main, next.dessert, primaryGuest.id).run();

    if (hasPlusOne) {
      const plusOneGuest = await env.DB.prepare(
        "SELECT id FROM guests WHERE rsvp_id = ?1 AND guest_type = 'plus_one' LIMIT 1"
      ).bind(rsvpId).first();
      if (plusOneGuest) {
        await env.DB.prepare(`
          UPDATE guest_menus
          SET menu = ?1, starter = ?2, main = ?3, dessert = ?4
          WHERE guest_id = ?5
        `).bind(plusOneMenu, next.plusOneStarter, next.plusOneMain, next.plusOneDessert, plusOneGuest.id).run();
      }
    }
  }

  return Response.json({ ok: true });
}

async function ensureLegacyRsvpToken(env, row) {
  if (!row) return null;
  if (row.token) return row;

  const token = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("UPDATE rsvps SET token = ?1 WHERE id = ?2").bind(token, row.id),
    env.DB.prepare("UPDATE guests SET token = ?1 WHERE rsvp_id = ?2 AND guest_type = 'primary'").bind(token, row.id),
  ]);

  return { ...row, token };
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

  const row = await env.DB.prepare("SELECT * FROM rsvps WHERE id = ?1 LIMIT 1").bind(rsvpId).first();
  if (!row) return Response.json({ error: "Not found." }, { status: 404 });

  const name = (body.name ?? row.name ?? "").trim();
  const email = (body.email ?? row.email ?? "").trim();
  const phone = (body.phone ?? row.phone ?? "").trim();
  const attendance = body.attendance ?? row.attendance ?? "";
  const events = body.events ?? row.events ?? "";
  const dietary = (body.dietary ?? row.dietary ?? "").trim();
  const notes = (body.notes ?? row.notes ?? "").trim();
  const menu = body.menu ?? row.menu ?? "";
  const transfer = body.transfer ?? row.transfer ?? "";
  const arrivalDatetime = (body.arrival_datetime ?? row.arrival_datetime ?? "").trim();
  const arrivalLocation = (body.arrival_location ?? row.arrival_location ?? "").trim();
  const returnDatetime = (body.return_datetime ?? row.return_datetime ?? "").trim();
  const returnLocation = (body.return_location ?? row.return_location ?? "").trim();
  const transferPartySize = (body.transfer_party_size ?? row.transfer_party_size ?? "").trim();
  const plusOneName = (body.plus_one_name ?? row.plus_one_name ?? "").trim();
  const plusOneMenu = body.plus_one_menu ?? row.plus_one_menu ?? "";

  let kidsJson = row.kids;
  if (Array.isArray(body.children)) {
    let existingKids = [];
    try { existingKids = JSON.parse(row.kids || "[]"); } catch { existingKids = []; }
    const merged = body.children.map((child, i) => ({
      name: (child.name || "").trim(),
      dietary: (child.dietary || "").trim() || existingKids[i]?.dietary || "",
    })).filter((kid) => kid.name);
    kidsJson = merged.length > 0 ? JSON.stringify(merged) : null;
  }

  await env.DB.prepare(`
    UPDATE rsvps SET
      name = ?2, email = ?3, phone = ?4, attendance = ?5, events = ?6,
      menu = ?7, dietary = ?8, notes = ?9,
      transfer = ?10, arrival_datetime = ?11, arrival_location = ?12,
      return_datetime = ?13, return_location = ?14, transfer_party_size = ?15,
      plus_one_name = ?16, plus_one_menu = ?17, kids = ?18
    WHERE id = ?1
  `).bind(
    rsvpId,
    name, email, phone, attendance, events,
    menu, dietary, notes,
    transfer, arrivalDatetime, arrivalLocation,
    returnDatetime, returnLocation, transferPartySize,
    plusOneName, plusOneMenu, kidsJson,
  ).run();

  // Best-effort sync to denormalized tables for any consumers still reading them
  const primaryGuest = await env.DB.prepare(
    "SELECT id FROM guests WHERE rsvp_id = ?1 AND guest_type = 'primary' LIMIT 1"
  ).bind(rsvpId).first();

  if (primaryGuest) {
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE guests SET name=?1, email=?2, phone=?3, attendance=?4, events=?5, dietary=?6, notes=?7
        WHERE id=?8
      `).bind(name, email, phone, attendance, events, dietary, notes, primaryGuest.id),
      env.DB.prepare("UPDATE guest_menus SET menu=?1 WHERE guest_id=?2").bind(menu, primaryGuest.id),
      env.DB.prepare("DELETE FROM guest_transfers WHERE guest_id=?1").bind(primaryGuest.id),
      env.DB.prepare(`
        INSERT INTO guest_transfers (guest_id, needs_transfer, arrival_datetime, arrival_location, return_datetime, return_location, party_size)
        VALUES (?1,?2,?3,?4,?5,?6,?7)
      `).bind(primaryGuest.id, transfer, arrivalDatetime, arrivalLocation, returnDatetime, returnLocation, transferPartySize),
    ]);

    const plusOneGuest = await env.DB.prepare(
      "SELECT id FROM guests WHERE rsvp_id = ?1 AND guest_type = 'plus_one' LIMIT 1"
    ).bind(rsvpId).first();
    if (plusOneGuest) {
      await env.DB.batch([
        env.DB.prepare("UPDATE guests SET name=?1 WHERE id=?2").bind(plusOneName, plusOneGuest.id),
        env.DB.prepare("UPDATE guest_menus SET menu=?1 WHERE guest_id=?2").bind(plusOneMenu, plusOneGuest.id),
      ]);
    }

    if (Array.isArray(body.children) && body.children.length > 0) {
      const { results: childRows } = await env.DB.prepare(
        "SELECT id FROM guests WHERE rsvp_id = ?1 AND guest_type = 'child' ORDER BY id"
      ).bind(rsvpId).all();
      const updates = childRows.map((c, i) => {
        const incoming = body.children[i];
        if (!incoming) return null;
        return env.DB.prepare("UPDATE guests SET name=?1, dietary=?2 WHERE id=?3")
          .bind((incoming.name || "").trim(), (incoming.dietary || "").trim(), c.id);
      }).filter(Boolean);
      if (updates.length > 0) await env.DB.batch(updates);
    }
  }

  return Response.json({ ok: true });
}

async function handleAdminCreateGuest(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }

  const name = (body.name || "").trim();
  if (!name) return Response.json({ error: "Name is required." }, { status: 400 });

  const submittedAt = new Date().toISOString();
  const token = crypto.randomUUID();
  const kids = Array.isArray(body.kids)
    ? body.kids.slice(0, 3).filter((k) => (k?.name || "").trim()).map((k) => ({
        name: String(k.name || "").trim(),
        dietary: String(k.dietary || "").trim(),
      }))
    : [];
  const plusOne = body.plus_one === "yes" ? "yes" : "no";
  const plusOneName = plusOne === "yes" ? (body.plus_one_name || "").trim() : "";

  try {
    const insert = await env.DB.prepare(`
      INSERT INTO rsvps (
        submitted_at, language, name, email, phone, attendance, events,
        menu, starter, main, dessert, transfer, dietary, notes,
        plus_one, plus_one_name, plus_one_menu, plus_one_starter, plus_one_main, plus_one_dessert,
        arrival_datetime, arrival_location, return_datetime, return_location, transfer_party_size,
        token, kids
      ) VALUES (?1,?2,?3,?4,?5,?6,?7,'','','','',?8,?9,?10,?11,?12,'','','','',?13,?14,?15,?16,?17,?18,?19)
    `).bind(
      submittedAt,
      body.language || "en",
      name,
      (body.email || "").trim(),
      (body.phone || "").trim(),
      body.attendance || "yes",
      body.events || "",
      body.transfer || "",
      (body.dietary || "").trim(),
      (body.notes || "").trim(),
      plusOne,
      plusOneName,
      (body.arrival_datetime || "").trim(),
      (body.arrival_location || "").trim(),
      (body.return_datetime || "").trim(),
      (body.return_location || "").trim(),
      (body.transfer_party_size || "").trim(),
      token,
      kids.length > 0 ? JSON.stringify(kids) : null,
    ).run();

    const id = insert?.meta?.last_row_id ?? null;
    return Response.json({ ok: true, id, token }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: "Insert failed.", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}

async function handlePrivateRsvps(env) {
  const { results: rsvps } = await env.DB.prepare(`
    SELECT * FROM rsvps ORDER BY datetime(submitted_at) DESC, id DESC
  `).all();

  const people = [];
  let vid = 100000;

  for (const r of rsvps) {
    const attending = r.attendance !== "no";
    people.push({
      id: r.id,
      submitted_at: r.submitted_at,
      name: r.name,
      email: r.email,
      phone: r.phone,
      attendance: r.attendance,
      events: r.events,
      guest_type: "primary",
      primary_guest_id: null,
      rsvp_id: r.id,
      menu: r.menu,
      starter: r.starter,
      main: r.main,
      dessert: r.dessert,
      dietary: r.dietary,
      notes: r.notes,
      transfer: r.transfer,
      arrival_datetime: r.arrival_datetime,
      arrival_location: r.arrival_location,
      return_datetime: r.return_datetime,
      return_location: r.return_location,
      transfer_party_size: r.transfer_party_size,
    });

    if (!attending) continue;

    if (r.plus_one === "yes" && r.plus_one_name) {
      people.push({
        id: vid++,
        submitted_at: r.submitted_at,
        name: r.plus_one_name,
        guest_type: "plus_one",
        primary_guest_id: r.id,
        rsvp_id: r.id,
        menu: r.plus_one_menu,
        starter: r.plus_one_starter,
        main: r.plus_one_main,
        dessert: r.plus_one_dessert,
        dietary: null,
        notes: null,
        events: r.events,
        attendance: "yes",
      });
    }

    let kids = [];
    try { kids = JSON.parse(r.kids || "[]"); } catch { /* empty */ }
    for (const kid of kids) {
      people.push({
        id: vid++,
        submitted_at: r.submitted_at,
        name: kid.name,
        guest_type: "child",
        primary_guest_id: r.id,
        rsvp_id: r.id,
        menu: "kids",
        dietary: kid.dietary,
        notes: null,
        events: r.events,
        attendance: "yes",
      });
    }
  }

  return Response.json(people);
}

