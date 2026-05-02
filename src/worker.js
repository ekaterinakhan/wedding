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
