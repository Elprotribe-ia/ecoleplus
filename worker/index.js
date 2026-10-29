const SESSION_COOKIE = "ecoleplus_session";
const SESSION_DAYS = 30;
const PASSWORD_ITERATIONS = 120000;
const encoder = new TextEncoder();
const INITIAL_DATA = {
  students: [], classes: [], timetable: [], attendance: {},
  attendanceRecords: [], notes: [], evaluations: [], payments: [],
  announcements: [], staff: []
};

function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers }
  });
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function sha256(value) {
  return bytesToBase64(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS },
    key,
    256
  );
  return `${bytesToBase64(salt)}:${bytesToBase64(derived)}`;
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let i = 0; i < left.length; i++) result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return result === 0;
}

async function verifyPassword(password, stored) {
  const [saltText, hashText] = String(stored || "").split(":");
  if (!saltText || !hashText) return false;
  const actual = await hashPassword(password, base64ToBytes(saltText));
  return constantTimeEqual(actual.split(":")[1], hashText);
}

function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const item = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(name + "="));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}

function cookieHeader(token, maxAge = SESSION_DAYS * 86400) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

async function requestJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function createSession(env, userId) {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = bytesToBase64(tokenBytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  const sessionId = await sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
  ).bind(sessionId, userId, expiresAt).run();
  return token;
}

async function getSession(request, env) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const sessionId = await sha256(token);
  return env.DB.prepare(
    `SELECT s.id AS session_id, u.id AS user_id, u.name AS user_name, u.role,
            sc.id AS school_id
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     JOIN schools sc ON sc.id = u.school_id
     WHERE s.id = ? AND s.expires_at > ? AND u.is_active = 1
     LIMIT 1`
  ).bind(sessionId, new Date().toISOString()).first();
}

function schoolProfile(row, payload) {
  if (payload?.school && typeof payload.school === "object") return payload.school;
  return {
    name: row.name, type: row.school_type, country: row.country, city: row.city,
    address: row.address, phone: row.phone, email: row.email, website: row.website,
    academicYear: row.academic_year, currency: row.currency, annualFee: row.annual_fee,
    gradeScale: row.grade_scale, levels: JSON.parse(row.levels_json || "[]"),
    adminName: row.admin_name, adminEmail: row.admin_email,
    studentIdPrefix: row.student_id_prefix
  };
}

async function getState(env, schoolId) {
  const result = await env.DB.prepare(
    "SELECT payload_json FROM school_state WHERE school_id = ?"
  ).bind(schoolId).first();
  if (!result?.payload_json) return { school: null, data: INITIAL_DATA };
  try {
    const payload = JSON.parse(result.payload_json);
    return {
      school: payload.school || null,
      data: { ...INITIAL_DATA, ...(payload.data || {}) }
    };
  } catch {
    return { school: null, data: INITIAL_DATA };
  }
}

function sqlSchoolValues(school) {
  const levels = Array.isArray(school.levels) ? school.levels : [];
  return [
    String(school.name || "").trim(),
    String(school.type || "").trim(),
    String(school.country || "").trim(),
    String(school.city || "").trim(),
    String(school.address || "").trim(),
    String(school.phone || "").trim(),
    String(school.email || "").trim(),
    String(school.website || "").trim(),
    String(school.academicYear || "").trim(),
    String(school.currency || "FCFA"),
    Math.max(0, Number(school.annualFee) || 0),
    Math.max(1, Number(school.gradeScale) || 20),
    JSON.stringify(levels),
    String(school.studentIdPrefix || "EP").trim().slice(0, 12),
    String(school.adminName || "").trim(),
    String(school.adminEmail || "").trim().toLowerCase()
  ];
}

async function handleApi(request, env, url) {
  const path = url.pathname;
  if (path === "/api/health" && request.method === "GET") {
    try {
      const row = await env.DB.prepare("SELECT 1 AS ok").first();
      return json({ status: row?.ok === 1 ? "ok" : "unavailable" });
    } catch {
      return json({ status: "unavailable" }, 503);
    }
  }

  if (["POST", "PUT", "DELETE"].includes(request.method)) {
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return json({ error: "Origine refusée." }, 403);
  }

  if (path === "/api/setup" && request.method === "POST") {
    const body = await requestJson(request);
    const school = body?.school;
    const email = String(school?.adminEmail || "").trim().toLowerCase();
    const password = String(body?.password || "");
    if (!school || !school.name || !school.country || !school.city ||
        !school.adminName || !email || password.length < 12) {
      return json({ error: "Vérifie les informations et choisis un mot de passe d’au moins 12 caractères." }, 400);
    }
    const schoolId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const payload = JSON.stringify({ school, data: INITIAL_DATA });
    const sessionToken = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))
      .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    const sessionId = await sha256(sessionToken);
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
    try {
      const statements = [
        env.DB.prepare(
          `INSERT INTO schools
           (id, name, school_type, country, city, address, phone, email, website,
            academic_year, currency, annual_fee, grade_scale, levels_json,
            student_id_prefix, admin_name, admin_email)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(schoolId, ...sqlSchoolValues(school)),
        env.DB.prepare(
          "INSERT INTO users (id, school_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(userId, schoolId, String(school.adminName).trim(), email, passwordHash, "Administrateur"),
        env.DB.prepare(
          "INSERT INTO school_state (school_id, payload_json) VALUES (?, ?)"
        ).bind(schoolId, payload),
        env.DB.prepare(
          "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
        ).bind(sessionId, userId, expiresAt)
      ];
      await env.DB.batch(statements);
      return json(
        { ok: true, schoolId },
        201,
        { "Set-Cookie": cookieHeader(sessionToken) }
      );
    } catch (error) {
      return json({ error: "Création impossible. Vérifie que la migration D1 est appliquée.", detail: String(error?.message || "") }, 500);
    }
  }

  if (path === "/api/login" && request.method === "POST") {
    const body = await requestJson(request);
    const schoolName = String(body?.schoolName || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    if (!schoolName || !email || !password) return json({ error: "Renseigne le nom de l’établissement, le courriel et le mot de passe." }, 400);
    const candidates = await env.DB.prepare(
      `SELECT u.id, u.password_hash
       FROM users u JOIN schools sc ON sc.id = u.school_id
       WHERE lower(u.email) = ? AND lower(sc.name) = ? AND u.is_active = 1
       LIMIT 20`
    ).bind(email, schoolName.toLowerCase()).all();
    let user = null;
    for (const candidate of candidates.results || []) {
      if (await verifyPassword(password, candidate.password_hash)) {
        user = candidate;
        break;
      }
    }
    if (!user) {
      return json({ error: "Nom d’établissement, courriel ou mot de passe incorrect." }, 401);
    }
    const token = await createSession(env, user.id);
    return json({ ok: true }, 200, { "Set-Cookie": cookieHeader(token) });
  }

  if (path === "/api/logout" && request.method === "POST") {
    const token = readCookie(request, SESSION_COOKIE);
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(await sha256(token)).run();
    return json({ ok: true }, 200, { "Set-Cookie": cookieHeader("", 0) });
  }

  if (path === "/api/session" && request.method === "GET") {
    const session = await getSession(request, env);
    if (!session) return json({ authenticated: false }, 401);
    const row = await env.DB.prepare(
      `SELECT sc.* FROM schools sc WHERE sc.id = ? LIMIT 1`
    ).bind(session.school_id).first();
    const payload = await getState(env, session.school_id);
    return json({
      authenticated: true,
      school: payload.school || schoolProfile(row, payload),
      data: payload.data,
      user: { name: session.user_name, role: session.role }
    });
  }

  if (path === "/api/state" && (request.method === "GET" || request.method === "PUT")) {
    const session = await getSession(request, env);
    if (!session) return json({ error: "Connexion requise." }, 401);
    if (request.method === "GET") return json(await getState(env, session.school_id));

    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).length > 1500000) return json({ error: "Les données dépassent la taille autorisée." }, 413);
    let body;
    try { body = JSON.parse(bodyText); } catch { return json({ error: "Données JSON invalides." }, 400); }
    const school = body?.school;
    const data = body?.data;
    if (!school || !data || typeof data !== "object" || Array.isArray(data)) {
      return json({ error: "Profil ou données manquants." }, 400);
    }
    const payload = JSON.stringify({ school, data: { ...INITIAL_DATA, ...data } });
    const values = sqlSchoolValues(school);
    try {
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE schools SET name = ?, school_type = ?, country = ?, city = ?,
           address = ?, phone = ?, email = ?, website = ?, academic_year = ?,
           currency = ?, annual_fee = ?, grade_scale = ?, levels_json = ?,
           student_id_prefix = ?, admin_name = ?, admin_email = ?,
           updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).bind(...values, session.school_id),
        env.DB.prepare(
          `INSERT INTO school_state (school_id, payload_json, updated_at)
           VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(school_id) DO UPDATE SET
           payload_json = excluded.payload_json, updated_at = CURRENT_TIMESTAMP`
        ).bind(session.school_id, payload)
      ]);
      return json({ ok: true, savedAt: new Date().toISOString() });
    } catch (error) {
      return json({ error: "Enregistrement D1 impossible.", detail: String(error?.message || "") }, 500);
    }
  }

  return json({ error: "Route API introuvable." }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env, url);
    return env.ASSETS.fetch(request);
  }
};
