// VOLPARIA Giyim — Cloudflare Workers + D1 veri katmanı (v2)
const encoder = new TextEncoder();
const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "Cross-Origin-Resource-Policy": "same-site",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};
let securitySchemaReady = false;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    if (origin && !isAllowedOrigin(origin, env)) return json({ error: "Bu alan adından erişime izin verilmiyor" }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...SECURITY_HEADERS, ...cors } });
    try {
      // ---- herkese açık ----
      if (url.pathname === "/api/health" && request.method === "GET") return json({ ok: true, service: "volparia-api" }, 200, cors);
      if (url.pathname === "/api/sync" && request.method === "GET") return sync(env, cors);
      if (url.pathname === "/api/bootstrap" && request.method === "GET") return bootstrap(env, cors);
      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        const limited = await rateLimit(request, env, "admin-login", 8, 15 * 60_000, 30 * 60_000, cors);
        return limited || login(request, env, cors);
      }
      if (url.pathname === "/api/orders" && request.method === "POST") {
        const limited = await rateLimit(request, env, "order-create", 10, 10 * 60_000, 30 * 60_000, cors);
        return limited || createOrder(request, env, cors);
      }
      if (url.pathname === "/api/newsletter" && request.method === "POST") {
        const limited = await rateLimit(request, env, "newsletter", 5, 60 * 60_000, 60 * 60_000, cors);
        return limited || newsletter(request, env, cors);
      }
      if (url.pathname === "/api/coupons/validate" && request.method === "POST") return validateCouponRequest(request, env, cors);
      if (url.pathname === "/api/reviews" && request.method === "GET") return listPublicReviews(env, url.searchParams.get("product") || "", cors);
      if (url.pathname === "/api/reviews" && request.method === "POST") {
        const limited = await rateLimit(request, env, "review-create", 5, 60 * 60_000, 2 * 60 * 60_000, cors);
        return limited || createReview(request, env, cors);
      }
      if (url.pathname.startsWith("/api/images/") && request.method === "GET") return serveImage(env, decodeURIComponent(url.pathname.split("/").pop()), cors);
      if (url.pathname === "/api/payments/init" && request.method === "POST") {
        const limited = await rateLimit(request, env, "payment-init", 10, 10 * 60_000, 30 * 60_000, cors);
        return limited || paymentInit(request, env, cors);
      }
      if (url.pathname === "/api/payments/callback/iyzico") return iyzicoCallback(request, env, url);
      if (url.pathname === "/api/payments/webhook/paytr" && request.method === "POST") return paytrWebhook(request, env);

      // ---- yönetici ----
      const admin = await authorize(request, env);
      if (!admin) return json({ error: "Yönetici oturumu gerekli" }, 401, cors);
      if (url.pathname === "/api/products/full" && request.method === "GET") return listFullProducts(env, cors);
      if (url.pathname.startsWith("/api/products/") && request.method === "PUT") return saveProduct(request, env, admin, decodeURIComponent(url.pathname.split("/").pop()), cors);
      if (url.pathname.startsWith("/api/products/") && request.method === "DELETE") return deleteProduct(env, admin, decodeURIComponent(url.pathname.split("/").pop()), cors);
      if (url.pathname === "/api/orders" && request.method === "GET") return listOrders(env, cors);
      if (url.pathname.startsWith("/api/orders/") && request.method === "PATCH") return updateOrder(request, env, admin, decodeURIComponent(url.pathname.split("/").pop()), cors);
      if (url.pathname === "/api/settings" && request.method === "PUT") return saveSettings(request, env, admin, cors);
      if (url.pathname === "/api/coupons" && request.method === "GET") return listCoupons(env, cors);
      if (url.pathname.startsWith("/api/coupons/") && request.method === "PUT") return saveCoupon(request, env, admin, decodeURIComponent(url.pathname.split("/").pop()), cors);
      if (url.pathname.startsWith("/api/coupons/") && request.method === "DELETE") return deleteCoupon(env, admin, decodeURIComponent(url.pathname.split("/").pop()), cors);
      if (url.pathname === "/api/reviews/all" && request.method === "GET") return listAllReviews(env, cors);
      if (url.pathname.startsWith("/api/reviews/") && request.method === "PATCH") return moderateReview(request, env, admin, decodeURIComponent(url.pathname.split("/").pop()), cors);
      if (url.pathname.startsWith("/api/reviews/") && request.method === "DELETE") return deleteReview(env, admin, decodeURIComponent(url.pathname.split("/").pop()), cors);
      if (url.pathname === "/api/newsletter" && request.method === "GET") return listSubscribers(env, cors);
      if (url.pathname === "/api/audit" && request.method === "GET") return listAudit(env, cors);
      if (url.pathname === "/api/images" && request.method === "POST") return uploadImage(request, env, admin, cors);
      if (url.pathname.startsWith("/api/images/") && request.method === "DELETE") return deleteImage(env, admin, decodeURIComponent(url.pathname.split("/").pop()), cors);
      if (url.pathname === "/api/export" && request.method === "GET") return exportAll(env, cors);
      if (url.pathname === "/api/pos/credentials" && request.method === "GET") return posCredentialStatus(env, cors);
      if (url.pathname === "/api/pos/credentials" && request.method === "PUT") return savePosCredentials(request, env, admin, cors);
      return json({ error: "Endpoint bulunamadı" }, 404, cors);
    } catch (error) {
      console.error(error);
      if (error instanceof HttpError) return json({ error: error.message }, error.status, cors);
      return json({ error: "Sunucu işlemi tamamlanamadı" }, 500, cors);
    }
  }
};

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function configuredOrigins(env) {
  const values = new Set();
  for (const candidate of String(env.ALLOWED_ORIGINS || "").split(",").map(v => v.trim()).filter(Boolean)) {
    try { values.add(new URL(candidate).origin); } catch { /* geçersiz yapılandırma */ }
  }
  try { values.add(new URL(storefrontUrl(env)).origin); } catch { /* geçersiz yapılandırma */ }
  return values;
}
function isAllowedOrigin(origin, env) {
  return !origin || configuredOrigins(env).has(origin);
}
function corsHeaders(origin, env) {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
  if (origin && isAllowedOrigin(origin, env)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data), { status, headers: { ...SECURITY_HEADERS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } }); }
async function body(request) {
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > 1_600_000) throw new HttpError(413, "İstek gövdesi çok büyük");
  const text = await request.text();
  if (text.length > 1_600_000) throw new HttpError(413, "İstek gövdesi çok büyük");
  let data;
  try { data = JSON.parse(text); } catch { throw new HttpError(400, "Geçersiz JSON gövdesi"); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new HttpError(400, "Geçersiz istek gövdesi");
  return data;
}
function safeJson(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
function safeHttpsUrl(value, maxLength = 500) {
  const text = String(value || "").trim().slice(0, maxLength);
  if (!text) return "";
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.href : "";
  } catch { return ""; }
}
function safeImageUrl(value) {
  const text = String(value || "").trim();
  if (/^data:image\/(?:webp|jpeg|png|gif);base64,[A-Za-z0-9+/=]+$/.test(text) && text.length <= 1_500_000) return text;
  return safeHttpsUrl(text, 1000);
}

async function ensureSecuritySchema(env) {
  if (securitySchemaReady) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS request_limits (key TEXT PRIMARY KEY, request_count INTEGER NOT NULL DEFAULT 0, window_started INTEGER NOT NULL, blocked_until INTEGER NOT NULL DEFAULT 0, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)").run();
  securitySchemaReady = true;
}
async function requestKey(request, env, scope) {
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0].trim() || "unknown";
  return hmac(`${scope}:${ip}`, env.SESSION_SECRET || env.ADMIN_PASSWORD || "volparia-rate-limit");
}
async function rateLimit(request, env, scope, maxRequests, windowMs, blockMs, cors) {
  await ensureSecuritySchema(env);
  const key = await requestKey(request, env, scope);
  const now = Date.now();
  const row = await env.DB.prepare("SELECT request_count,window_started,blocked_until FROM request_limits WHERE key=?").bind(key).first();
  if (row?.blocked_until > now) {
    const retry = Math.max(1, Math.ceil((row.blocked_until - now) / 1000));
    return json({ error: "Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin." }, 429, { ...cors, "Retry-After": String(retry) });
  }
  const sameWindow = row && now - Number(row.window_started) < windowMs;
  const count = sameWindow ? Number(row.request_count) + 1 : 1;
  const windowStarted = sameWindow ? Number(row.window_started) : now;
  const blockedUntil = count > maxRequests ? now + blockMs : 0;
  await env.DB.prepare("INSERT INTO request_limits(key,request_count,window_started,blocked_until,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET request_count=excluded.request_count,window_started=excluded.window_started,blocked_until=excluded.blocked_until,updated_at=CURRENT_TIMESTAMP")
    .bind(key, count, windowStarted, blockedUntil).run();
  if (!blockedUntil) return null;
  return json({ error: "Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin." }, 429, { ...cors, "Retry-After": String(Math.ceil(blockMs / 1000)) });
}

function rowToProduct(row) {
  return {
    id: row.id, name: row.name, brand: row.brand, sku: row.sku, category: row.category,
    gender: row.gender, price: row.price, oldPrice: row.old_price, badge: row.badge,
    tags: safeJson(row.tags, []), tone: row.tone, description: row.description,
    fabric: row.fabric, care: row.care, imageUrl: row.image_url || "",
    sizes: safeJson(row.sizes, []), criticalStock: row.critical_stock ?? 5, active: Boolean(row.active)
  };
}

// ---- sürüm sayacı ----
async function getVersion(env) {
  const row = await env.DB.prepare("SELECT value FROM store_settings WHERE key='version'").first();
  return Number(row?.value) || 1;
}
async function bumpVersion(env) {
  await env.DB.prepare("INSERT INTO store_settings(key,value,updated_at) VALUES('version','2',CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=CAST(CAST(value AS INTEGER)+1 AS TEXT), updated_at=CURRENT_TIMESTAMP").run();
}
async function sync(env, cors) { return json({ v: await getVersion(env) }, 200, cors); }

async function bootstrap(env, cors) {
  const [products, settings, reviewStats, posRows, v] = await Promise.all([
    env.DB.prepare("SELECT * FROM products WHERE active = 1 ORDER BY created_at ASC").all(),
    env.DB.prepare("SELECT value FROM store_settings WHERE key='store'").first(),
    env.DB.prepare("SELECT product_id, COUNT(*) count, ROUND(AVG(rating),1) avg FROM reviews WHERE status='approved' GROUP BY product_id").all().catch(() => ({ results: [] })),
    env.DB.prepare("SELECT provider FROM pos_credentials").all().catch(() => ({ results: [] })),
    getVersion(env)
  ]);
  const stats = Object.fromEntries(reviewStats.results.map(r => [r.product_id, { count: r.count, avg: r.avg }]));
  const parsedSettings = safeJson(settings?.value, {});
  const activeProvider = parsedSettings.provider === "paytr" ? "paytr" : "iyzico";
  const pos = { configured: posRows.results.some(r => r.provider === activeProvider), provider: activeProvider, testMode: Boolean(parsedSettings.testMode) };
  return json({ products: products.results.map(rowToProduct), settings: parsedSettings, reviewStats: stats, pos, v }, 200, cors);
}
function storefrontUrl(env) { return (env.STOREFRONT_URL || "https://r0yc0ld.github.io/volparia/").replace(/\/?$/, "/"); }

// ---- kimlik doğrulama ----
async function login(request, env, cors) {
  const data = await body(request);
  const expectedUser = env.ADMIN_USERNAME || "admin";
  const expectedPassword = env.ADMIN_PASSWORD;
  if (!expectedPassword || String(expectedPassword).length < 12 || !env.SESSION_SECRET || String(env.SESSION_SECRET).length < 32) {
    return json({ error: "Yönetici güvenlik sırları sunucuda güvenli biçimde yapılandırılmamış" }, 503, cors);
  }
  const validUser = await constantEqual(String(data.username || ""), expectedUser);
  const validPassword = await constantEqual(String(data.password || ""), expectedPassword);
  if (!validUser || !validPassword) return json({ error: "Kullanıcı adı veya şifre hatalı" }, 401, cors);
  const now = Date.now();
  const token = await signToken({ sub: expectedUser, iss: "volparia-api", aud: "volparia-admin", iat: now, exp: now + 2 * 60 * 60 * 1000, jti: crypto.randomUUID() }, env.SESSION_SECRET);
  await audit(env, expectedUser, "admin.login", "session", null, {});
  return json({ token, expiresIn: 7200 }, 200, cors);
}
async function authorize(request, env) {
  const raw = request.headers.get("Authorization") || "";
  if (!raw.startsWith("Bearer ") || !env.SESSION_SECRET) return null;
  const token = raw.slice(7), [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = await hmac(payload, env.SESSION_SECRET);
  if (!(await constantEqual(signature, expected))) return null;
  const data = safeJson(decodeBase64Url(payload), null);
  const now = Date.now();
  return data && data.iss === "volparia-api" && data.aud === "volparia-admin" &&
    typeof data.sub === "string" && data.iat <= now + 60_000 && data.exp > now && data.exp - data.iat <= 2 * 60 * 60_000
    ? data.sub : null;
}
async function signToken(data, secret) { if (!secret) throw new Error("SESSION_SECRET missing"); const payload = encodeBase64Url(JSON.stringify(data)); return `${payload}.${await hmac(payload, secret)}`; }
async function hmac(value, secret) { const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value)); return encodeBase64Url(new Uint8Array(sig)); }
async function constantEqual(a, b) { const [ha, hb] = await Promise.all([crypto.subtle.digest("SHA-256", encoder.encode(a)), crypto.subtle.digest("SHA-256", encoder.encode(b))]); const aa = new Uint8Array(ha), bb = new Uint8Array(hb); let diff = 0; for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i]; return diff === 0; }
function toBase64(bytes) { let binary = ""; bytes.forEach(b => binary += String.fromCharCode(b)); return btoa(binary); }
function fromBase64(value) { const binary = atob(value); return Uint8Array.from(binary, c => c.charCodeAt(0)); }
function encodeBase64Url(value) { const bytes = typeof value === "string" ? encoder.encode(value) : value; return toBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); }
function decodeBase64Url(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return new TextDecoder().decode(fromBase64(normalized + "=".repeat((4 - normalized.length % 4) % 4)));
}

// ---- ürünler ----
function sanitizeSizes(input) {
  return (Array.isArray(input) ? input : []).slice(0, 30)
    .map(s => ({ name: String(s.name || "").trim().toUpperCase().slice(0, 12), stock: Math.max(0, Math.round(Number(s.stock) || 0)) }))
    .filter(s => s.name);
}
async function saveProduct(request, env, actor, id, cors) {
  const p = await body(request);
  if (!p.name || !p.sku) return json({ error: "Ürün adı ve ürün kodu (SKU) zorunlu" }, 400, cors);
  const sizes = sanitizeSizes(p.sizes);
  if (!sizes.length) return json({ error: "En az bir beden girin" }, 400, cors);
  const sku = String(p.sku).trim().toUpperCase().slice(0, 40);
  const clash = await env.DB.prepare("SELECT id, name FROM products WHERE sku = ? AND id != ?").bind(sku, id).first();
  if (clash) return json({ error: `Bu ürün kodu zaten "${clash.name}" ürününde kullanılıyor` }, 409, cors);
  await env.DB.prepare(`INSERT INTO products(id,name,brand,sku,category,gender,price,old_price,badge,tags,tone,description,fabric,care,image_url,sizes,critical_stock,active,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,brand=excluded.brand,sku=excluded.sku,category=excluded.category,gender=excluded.gender,price=excluded.price,old_price=excluded.old_price,badge=excluded.badge,tags=excluded.tags,tone=excluded.tone,description=excluded.description,fabric=excluded.fabric,care=excluded.care,image_url=excluded.image_url,sizes=excluded.sizes,critical_stock=excluded.critical_stock,active=excluded.active,updated_at=CURRENT_TIMESTAMP`)
    .bind(
      id, String(p.name).slice(0, 120), String(p.brand || "").slice(0, 80), sku,
      String(p.category || "").slice(0, 60), ["kadin", "erkek", "unisex", "cocuk"].includes(p.gender) ? p.gender : "unisex",
      Math.max(0, Number(p.price) || 0), p.oldPrice ? Math.max(0, Number(p.oldPrice) || 0) : null,
      p.badge ? String(p.badge).slice(0, 40) : null, JSON.stringify((Array.isArray(p.tags) ? p.tags : []).filter(t => ["new", "sale", "bestseller"].includes(t))),
      /^#[0-9a-fA-F]{6}$/.test(p.tone) ? p.tone : "#e8e2d6",
      String(p.description || "").slice(0, 2000), String(p.fabric || "").slice(0, 300), String(p.care || "").slice(0, 300),
      safeImageUrl(p.imageUrl) || null, JSON.stringify(sizes),
      Math.max(1, Math.round(Number(p.criticalStock) || 5)), p.active === false ? 0 : 1
    ).run();
  await bumpVersion(env);
  await audit(env, actor, "product.saved", "product", id, { sku });
  return json({ ok: true }, 200, cors);
}
async function deleteProduct(env, actor, id, cors) {
  const product = await env.DB.prepare("SELECT id, name FROM products WHERE id = ?").bind(id).first();
  if (!product) return json({ error: "Ürün bulunamadı" }, 404, cors);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM reviews WHERE product_id = ?").bind(id),
    env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id)
  ]);
  await bumpVersion(env);
  await audit(env, actor, "product.deleted", "product", id, { name: product.name });
  return json({ ok: true }, 200, cors);
}
async function listFullProducts(env, cors) {
  const rows = await env.DB.prepare("SELECT * FROM products ORDER BY created_at ASC").all();
  return json({ products: rows.results.map(rowToProduct) }, 200, cors);
}

// ---- kuponlar ----
async function findCoupon(env, code, total) {
  const row = await env.DB.prepare("SELECT * FROM coupons WHERE code = ? AND active = 1").bind(code).first();
  if (!row) return { error: "Kupon bulunamadı" };
  if (row.usage_limit && row.used_count >= row.usage_limit) return { error: "Kupon kullanım limiti doldu" };
  if (total < (row.min_total || 0)) return { error: `Bu kupon için minimum sepet tutarı ${row.min_total} TL` };
  let discount = 0;
  if (row.type === "percent") discount = Math.floor(total * row.value / 100);
  else if (row.type === "fixed") discount = Math.min(row.value, total);
  return { coupon: { code: row.code, type: row.type, value: row.value, minTotal: row.min_total || 0, discount } };
}
async function validateCouponRequest(request, env, cors) {
  const data = await body(request);
  const code = String(data.code || "").trim().toUpperCase();
  const total = Math.max(0, Number(data.total) || 0);
  if (!code) return json({ error: "Kupon kodu girin" }, 400, cors);
  const result = await findCoupon(env, code, total);
  if (result.error) return json({ error: result.error }, 404, cors);
  return json(result, 200, cors);
}
async function listCoupons(env, cors) {
  const rows = await env.DB.prepare("SELECT * FROM coupons ORDER BY created_at DESC LIMIT 200").all();
  return json({ coupons: rows.results }, 200, cors);
}
async function saveCoupon(request, env, actor, code, cors) {
  const data = await body(request);
  const clean = String(code || "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,24}$/.test(clean)) return json({ error: "Kupon kodu 3-24 harf/rakam olmalı" }, 400, cors);
  const type = data.type === "fixed" ? "fixed" : "percent";
  const value = Math.max(0, Math.min(type === "percent" ? 90 : 1000000, Number(data.value) || 0));
  if (value <= 0) return json({ error: "Kupon değeri girin" }, 400, cors);
  await env.DB.prepare("INSERT INTO coupons(code,type,value,min_total,usage_limit,active) VALUES(?,?,?,?,?,?) ON CONFLICT(code) DO UPDATE SET type=excluded.type,value=excluded.value,min_total=excluded.min_total,usage_limit=excluded.usage_limit,active=excluded.active")
    .bind(clean, type, value, Math.max(0, Number(data.minTotal) || 0), data.usageLimit ? Math.max(1, Number(data.usageLimit)) : null, data.active === false ? 0 : 1).run();
  await bumpVersion(env);
  await audit(env, actor, "coupon.saved", "coupon", clean, { type, value });
  return json({ ok: true }, 200, cors);
}
async function deleteCoupon(env, actor, code, cors) {
  await env.DB.prepare("DELETE FROM coupons WHERE code = ?").bind(String(code).toUpperCase()).run();
  await bumpVersion(env);
  await audit(env, actor, "coupon.deleted", "coupon", code, {});
  return json({ ok: true }, 200, cors);
}

// ---- yorumlar ----
async function createReview(request, env, cors) {
  const data = await body(request);
  const productId = String(data.productId || "").trim();
  const name = String(data.name || "").trim().slice(0, 60);
  const rating = Math.max(1, Math.min(5, Math.round(Number(data.rating) || 0)));
  const comment = String(data.comment || "").trim().slice(0, 800);
  if (!productId || !name || !comment || !Number(data.rating)) return json({ error: "İsim, puan ve yorum zorunlu" }, 400, cors);
  const product = await env.DB.prepare("SELECT id FROM products WHERE id = ? AND active = 1").bind(productId).first();
  if (!product) return json({ error: "Ürün bulunamadı" }, 404, cors);
  const id = `rev_${crypto.randomUUID().slice(0, 12)}`;
  await env.DB.prepare("INSERT INTO reviews(id,product_id,name,rating,comment,status) VALUES(?,?,?,?,?,'pending')").bind(id, productId, name, rating, comment).run();
  await audit(env, "storefront", "review.created", "review", id, { productId, rating });
  return json({ ok: true, id, status: "pending" }, 201, cors);
}
async function listPublicReviews(env, productId, cors) {
  if (!productId) return json({ error: "Ürün belirtin" }, 400, cors);
  const rows = await env.DB.prepare("SELECT id,name,rating,comment,created_at FROM reviews WHERE product_id = ? AND status='approved' ORDER BY created_at DESC LIMIT 50").bind(productId).all();
  return json({ reviews: rows.results }, 200, cors);
}
async function listAllReviews(env, cors) {
  const rows = await env.DB.prepare("SELECT r.*, p.name product_name FROM reviews r LEFT JOIN products p ON p.id = r.product_id ORDER BY r.created_at DESC LIMIT 300").all();
  return json({ reviews: rows.results }, 200, cors);
}
async function moderateReview(request, env, actor, id, cors) {
  const data = await body(request);
  if (!["approved", "rejected", "pending"].includes(data.status)) return json({ error: "Geçersiz durum" }, 400, cors);
  await env.DB.prepare("UPDATE reviews SET status=? WHERE id=?").bind(data.status, id).run();
  await bumpVersion(env);
  await audit(env, actor, "review.moderated", "review", id, { status: data.status });
  return json({ ok: true }, 200, cors);
}
async function deleteReview(env, actor, id, cors) {
  await env.DB.prepare("DELETE FROM reviews WHERE id=?").bind(id).run();
  await bumpVersion(env);
  await audit(env, actor, "review.deleted", "review", id, {});
  return json({ ok: true }, 200, cors);
}

// ---- görseller ----
async function uploadImage(request, env, actor, cors) {
  const data = await body(request);
  const match = /^data:(image\/(?:webp|jpeg|png|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(data.data || ""));
  if (!match) return json({ error: "Geçersiz görsel verisi" }, 400, cors);
  const [, contentType, base64] = match;
  if (base64.length > 1400000) return json({ error: "Görsel çok büyük (en fazla ~1 MB)." }, 413, cors);
  const id = `img_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  await env.DB.prepare("INSERT INTO images(id,data,content_type,size) VALUES(?,?,?,?)").bind(id, base64, contentType, Math.round(base64.length * 3 / 4)).run();
  await audit(env, actor, "image.uploaded", "image", id, { contentType });
  return json({ id, url: `${new URL(request.url).origin}/api/images/${id}` }, 201, cors);
}
async function serveImage(env, id, cors) {
  const row = await env.DB.prepare("SELECT data, content_type FROM images WHERE id = ?").bind(id).first();
  if (!row) return new Response("Not found", { status: 404, headers: SECURITY_HEADERS });
  return new Response(fromBase64(row.data), { headers: { ...SECURITY_HEADERS, ...cors, "Cross-Origin-Resource-Policy": "cross-origin", "Content-Type": row.content_type, "Cache-Control": "public, max-age=31536000, immutable" } });
}
async function deleteImage(env, actor, id, cors) {
  await env.DB.prepare("DELETE FROM images WHERE id = ?").bind(id).run();
  await audit(env, actor, "image.deleted", "image", id, {});
  return json({ ok: true }, 200, cors);
}

// ---- siparişler ----
function sanitizeCustomer(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  return {
    firstName: String(source.firstName || "").trim().slice(0, 80),
    lastName: String(source.lastName || "").trim().slice(0, 80),
    email: String(source.email || "").trim().toLowerCase().slice(0, 160),
    phone: String(source.phone || "").trim().slice(0, 40),
    city: String(source.city || "").trim().slice(0, 80),
    address: String(source.address || "").trim().slice(0, 500)
  };
}
function calculateBundleDiscount(items, settings) {
  const bundles = Array.isArray(settings?.bundles) ? settings.bundles : [];
  let discount = 0;
  for (const bundle of bundles) {
    if (!bundle || bundle.active === false) continue;
    const productIds = [...new Set((Array.isArray(bundle.productIds) ? bundle.productIds : []).map(String))];
    if (productIds.length < 2) continue;
    const counts = new Map();
    for (const item of items) {
      if (item.bundleId !== String(bundle.id || "")) continue;
      counts.set(item.id, (counts.get(item.id) || 0) + item.quantity);
    }
    const completeSets = Math.min(...productIds.map(id => counts.get(id) || 0));
    if (!Number.isFinite(completeSets) || completeSets <= 0) continue;
    const setGross = productIds.reduce((sum, id) => sum + (items.find(item => item.id === id)?.unitPrice || 0), 0);
    const percent = Math.max(0, Math.min(90, Number(bundle.discountPercent) || 0));
    discount += completeSets * (setGross - Math.round(setGross * (100 - percent) / 100));
  }
  return Math.max(0, Math.round(discount));
}
async function createOrder(request, env, cors) {
  const data = await body(request);
  const customer = sanitizeCustomer(data.customer);
  const items = Array.isArray(data.items) ? data.items.slice(0, 50) : [];
  if (!customer.firstName || !customer.lastName || !customer.address || !customer.city || !customer.phone || !items.length ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    return json({ error: "Sipariş bilgileri eksik veya geçersiz" }, 400, cors);
  }
  const ids = [...new Set(items.map(i => String(i.id)))];
  if (!ids.length || ids.some(id => !/^[A-Za-z0-9_-]{1,80}$/.test(id))) return json({ error: "Sepette geçersiz ürün var" }, 400, cors);
  const marks = ids.map(() => "?").join(",");
  const rows = await env.DB.prepare(`SELECT id,name,price,sizes FROM products WHERE active=1 AND id IN (${marks})`).bind(...ids).all();
  const products = new Map(rows.results.map(p => [p.id, { ...p, sizeList: safeJson(p.sizes, []) }]));
  let gross = 0;
  const normalized = [];
  const touched = new Set();
  for (const item of items) {
    const p = products.get(String(item.id));
    const quantity = Math.max(1, Math.min(20, Math.round(Number(item.quantity) || 1)));
    const sizeName = String(item.size || "").toUpperCase();
    if (!p) return json({ error: "Sepetteki bir ürün artık satışta değil" }, 409, cors);
    const size = p.sizeList.find(s => s.name === sizeName);
    if (!size) return json({ error: `${p.name} için ${sizeName} bedeni bulunamadı` }, 409, cors);
    if (Number(size.stock) < quantity) return json({ error: `${p.name} — ${sizeName} bedeninde yeterli stok yok` }, 409, cors);
    size.stock = Number(size.stock) - quantity;
    touched.add(p.id);
    gross += p.price * quantity;
    normalized.push({
      id: p.id, name: p.name, size: sizeName, unitPrice: p.price, quantity,
      bundleId: /^[A-Za-z0-9_-]{1,80}$/.test(String(item.bundleId || "")) ? String(item.bundleId) : ""
    });
  }
  const settingsRow = await env.DB.prepare("SELECT value FROM store_settings WHERE key='store'").first();
  const settings = safeJson(settingsRow?.value, {});
  const bundleDiscount = Math.min(gross, calculateBundleDiscount(normalized, settings));
  const couponBase = Math.max(0, gross - bundleDiscount);
  let couponDiscount = 0, couponCode = null;
  if (data.coupon) {
    const result = await findCoupon(env, String(data.coupon).trim().toUpperCase(), couponBase);
    if (result.coupon) { couponDiscount = result.coupon.discount; couponCode = result.coupon.code; }
  }
  const discount = Math.min(gross, bundleDiscount + couponDiscount);
  const total = Math.max(0, gross - discount);
  const method = ["card", "cod", "transfer"].includes(data.payment) ? data.payment : "transfer";
  const id = `ord_${crypto.randomUUID().replaceAll("-", "")}`;
  const orderNo = `VP-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  const checkoutToken = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const statements = [
    env.DB.prepare("INSERT INTO orders(id,order_no,customer_json,total,discount,coupon_code,status,payment_method,payment_status,payment_token,shipping_address) VALUES(?,?,?,?,?,?,'new',?,'awaiting',?,?)")
      .bind(id, orderNo, JSON.stringify(customer), total, discount, couponCode, method, checkoutToken, customer.address)
  ];
  normalized.forEach(i => statements.push(env.DB.prepare("INSERT INTO order_items(order_id,product_id,product_name,size,unit_price,quantity) VALUES(?,?,?,?,?,?)").bind(id, i.id, i.name, i.size, i.unitPrice, i.quantity)));
  touched.forEach(pid => statements.push(env.DB.prepare("UPDATE products SET sizes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(JSON.stringify(products.get(pid).sizeList), pid)));
  if (couponCode) statements.push(env.DB.prepare("UPDATE coupons SET used_count=used_count+1 WHERE code=?").bind(couponCode));
  await env.DB.batch(statements);
  await bumpVersion(env);
  await audit(env, "storefront", "order.created", "order", id, { orderNo, total, discount, bundleDiscount, couponDiscount, coupon: couponCode });
  return json({ order: { id, orderNo, total, discount, bundleDiscount, couponDiscount, coupon: couponCode, status: "new", checkoutToken } }, 201, cors);
}
async function listOrders(env, cors) {
  const rows = await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 300").all();
  const itemsRows = await env.DB.prepare("SELECT order_id, product_id id, product_name, size, unit_price, quantity FROM order_items").all();
  const byOrder = new Map();
  itemsRows.results.forEach(i => { (byOrder.get(i.order_id) || byOrder.set(i.order_id, []).get(i.order_id)).push(i); });
  return json({ orders: rows.results.map(o => {
    const { customer_json, payment_token, ...safeOrder } = o;
    return { ...safeOrder, customer: safeJson(customer_json, {}), items: byOrder.get(o.id) || [] };
  }) }, 200, cors);
}
async function updateOrder(request, env, actor, id, cors) {
  const data = await body(request);
  const updates = [], binds = [];
  if (data.status) {
    if (!["new", "preparing", "shipped", "complete", "cancelled"].includes(data.status)) return json({ error: "Geçersiz durum" }, 400, cors);
    updates.push("status=?"); binds.push(data.status);
  }
  if (data.paymentStatus) {
    if (!["awaiting", "paid", "refunded"].includes(data.paymentStatus)) return json({ error: "Geçersiz ödeme durumu" }, 400, cors);
    updates.push("payment_status=?"); binds.push(data.paymentStatus);
  }
  if (!updates.length) return json({ error: "Güncellenecek alan yok" }, 400, cors);
  await env.DB.prepare(`UPDATE orders SET ${updates.join(",")},updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...binds, id).run();
  await bumpVersion(env);
  await audit(env, actor, "order.updated", "order", id, data);
  return json({ ok: true }, 200, cors);
}

// ---- ayarlar, bülten, denetim, dışa aktarım ----
async function saveSettings(request, env, actor, cors) {
  const data = await body(request);
  const pages = {};
  if (data.pages && typeof data.pages === "object") {
    for (const [key, page] of Object.entries(data.pages)) {
      if (!/^[a-z0-9-]{1,40}$/.test(key) || !page || typeof page !== "object") continue;
      pages[key] = { title: String(page.title || "").slice(0, 120), body: String(page.body || "").slice(0, 12000) };
    }
  }
  const safe = {
    announcement: String(data.announcement || "").slice(0, 240),
    heroEyebrow: String(data.heroEyebrow || "").slice(0, 100),
    heroTitle: String(data.heroTitle || "").slice(0, 150),
    heroCopy: String(data.heroCopy || "").slice(0, 500),
    shippingThreshold: Math.max(0, Number(data.shippingThreshold) || 0),
    criticalStockDefault: Math.max(1, Math.round(Number(data.criticalStockDefault) || 5)),
    categories: (Array.isArray(data.categories) ? data.categories : []).slice(0, 20).map(c => String(c).slice(0, 40)).filter(Boolean),
    bankTransfer: Boolean(data.bankTransfer), cashOnDelivery: Boolean(data.cashOnDelivery),
    provider: data.provider === "paytr" ? "paytr" : "iyzico",
    testMode: Boolean(data.testMode),
    installments: (Array.isArray(data.installments) ? data.installments : []).filter(n => [2, 3, 6, 9, 12].includes(Number(n))).map(Number),
    supportEmail: String(data.supportEmail || "").slice(0, 120), supportPhone: String(data.supportPhone || "").slice(0, 40),
    bankName: String(data.bankName || "").slice(0, 80), accountHolder: String(data.accountHolder || "").slice(0, 80),
    iban: String(data.iban || "").slice(0, 40),
    companyName: String(data.companyName || "").slice(0, 120), companyAddress: String(data.companyAddress || "").slice(0, 240),
    seoTitle: String(data.seoTitle || "").slice(0, 80), seoDescription: String(data.seoDescription || "").slice(0, 180),
    instagram: safeHttpsUrl(data.instagram, 200), tiktok: safeHttpsUrl(data.tiktok, 200),
    twitter: safeHttpsUrl(data.twitter, 200), whatsapp: String(data.whatsapp || "").replace(/\D/g, "").slice(0, 15),
    bundles: (Array.isArray(data.bundles) ? data.bundles : []).slice(0, 40).map(b => ({
      id: (String(b.id || "").slice(0, 40)) || `b_${crypto.randomUUID().slice(0, 8)}`,
      name: String(b.name || "").slice(0, 120),
      description: String(b.description || "").slice(0, 500),
      productIds: (Array.isArray(b.productIds) ? b.productIds : []).slice(0, 4).map(String),
      discountPercent: Math.max(0, Math.min(90, Math.round(Number(b.discountPercent) || 0))),
      badge: b.badge ? String(b.badge).slice(0, 40) : null,
      tone: /^#[0-9a-fA-F]{6}$/.test(b.tone) ? b.tone : "#e8e2d6",
      active: b.active !== false
    })).filter(b => b.name && b.productIds.length >= 2),
    pages
  };
  await env.DB.prepare("INSERT INTO store_settings(key,value,updated_at) VALUES('store',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(JSON.stringify(safe)).run();
  await bumpVersion(env);
  await audit(env, actor, "settings.updated", "settings", "store", {});
  return json({ ok: true, settings: safe }, 200, cors);
}
async function newsletter(request, env, cors) {
  const data = await body(request);
  const email = String(data.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Geçerli bir e-posta adresi girin" }, 400, cors);
  await env.DB.prepare("INSERT OR IGNORE INTO newsletter_subscribers(email) VALUES(?)").bind(email).run();
  return json({ ok: true }, 201, cors);
}
async function listSubscribers(env, cors) {
  const rows = await env.DB.prepare("SELECT email, created_at FROM newsletter_subscribers ORDER BY created_at DESC LIMIT 2000").all();
  return json({ subscribers: rows.results }, 200, cors);
}
async function listAudit(env, cors) {
  const rows = await env.DB.prepare("SELECT actor,action,entity_type,entity_id,metadata,created_at FROM audit_log ORDER BY created_at DESC, id DESC LIMIT 150").all();
  return json({ audit: rows.results.map(r => ({ ...r, metadata: safeJson(r.metadata, {}) })) }, 200, cors);
}
async function exportAll(env, cors) {
  const [products, settings, coupons, orders, reviews, subscribers] = await Promise.all([
    env.DB.prepare("SELECT * FROM products").all(),
    env.DB.prepare("SELECT value FROM store_settings WHERE key='store'").first(),
    env.DB.prepare("SELECT * FROM coupons").all(),
    env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC").all(),
    env.DB.prepare("SELECT * FROM reviews").all(),
    env.DB.prepare("SELECT * FROM newsletter_subscribers").all()
  ]);
  return json({
    exportedAt: new Date().toISOString(),
    products: products.results.map(rowToProduct),
    settings: safeJson(settings?.value, {}),
    coupons: coupons.results,
    orders: orders.results.map(({ payment_token, ...order }) => order),
    reviews: reviews.results, subscribers: subscribers.results
  }, 200, cors);
}

async function audit(env, actor, action, type, id, metadata) {
  await env.DB.prepare("INSERT INTO audit_log(actor,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").bind(actor, action, type, id, JSON.stringify(metadata || {})).run();
}

/* ================= SANAL POS =================
   Kimlik bilgileri D1'de AES-GCM ile şifreli tutulur; anahtar SESSION_SECRET'tan türetilir.
   Panelden bilgiler kaydedilince kart ödemesi vitrinde otomatik aktifleşir. */
async function hmacRawB64(value, secret) { const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value)); return toBase64(new Uint8Array(sig)); }
async function hmacHex(value, secret) { const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value)); return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join(""); }
async function posAesKey(env) { const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`${env.SESSION_SECRET}|pos-credentials`)); return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]); }
async function encryptCredentials(env, obj) { const iv = crypto.getRandomValues(new Uint8Array(12)); const key = await posAesKey(env); const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(obj))); return JSON.stringify({ iv: toBase64(iv), data: toBase64(new Uint8Array(data)) }); }
async function decryptCredentials(env, text) { try { const { iv, data } = JSON.parse(text); const key = await posAesKey(env); const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(data)); return JSON.parse(new TextDecoder().decode(plain)); } catch { return null; } }
async function getCredentials(env, provider) { const row = await env.DB.prepare("SELECT data FROM pos_credentials WHERE provider = ?").bind(provider).first(); return row ? decryptCredentials(env, row.data) : null; }
const maskHint = value => value ? `••••${String(value).slice(-4)}` : null;

async function savePosCredentials(request, env, actor, cors) {
  const data = await body(request);
  const provider = String(data.provider || "");
  let clean = null;
  if (provider === "iyzico") {
    const apiKey = String(data.apiKey || "").trim(), secretKey = String(data.secretKey || "").trim();
    if (!apiKey || !secretKey) return json({ error: "iyzico API anahtarı ve gizli anahtar zorunlu" }, 400, cors);
    clean = { apiKey, secretKey, sandbox: Boolean(data.sandbox) };
  } else if (provider === "paytr") {
    const merchantId = String(data.merchantId || "").trim(), merchantKey = String(data.merchantKey || "").trim(), merchantSalt = String(data.merchantSalt || "").trim();
    if (!merchantId || !merchantKey || !merchantSalt) return json({ error: "PayTR mağaza no, anahtar ve salt zorunlu" }, 400, cors);
    clean = { merchantId, merchantKey, merchantSalt };
  } else return json({ error: "Geçersiz sağlayıcı" }, 400, cors);
  const encrypted = await encryptCredentials(env, clean);
  await env.DB.prepare("INSERT INTO pos_credentials(provider,data,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(provider) DO UPDATE SET data=excluded.data,updated_at=CURRENT_TIMESTAMP").bind(provider, encrypted).run();
  await bumpVersion(env);
  await audit(env, actor, "pos.credentials.saved", "pos", provider, {});
  return json({ ok: true }, 200, cors);
}
async function posCredentialStatus(env, cors) {
  const rows = await env.DB.prepare("SELECT provider, data, updated_at FROM pos_credentials").all();
  const status = {};
  for (const row of rows.results) {
    const creds = await decryptCredentials(env, row.data);
    if (!creds) { status[row.provider] = { configured: false }; continue; }
    if (row.provider === "iyzico") status[row.provider] = { configured: true, hint: maskHint(creds.apiKey), sandbox: Boolean(creds.sandbox), updatedAt: row.updated_at };
    else if (row.provider === "paytr") status[row.provider] = { configured: true, hint: maskHint(creds.merchantId), updatedAt: row.updated_at };
  }
  return json({ pos: status }, 200, cors);
}

async function paymentInit(request, env, cors) {
  const data = await body(request);
  const orderId = String(data.orderId || "");
  const checkoutToken = String(data.checkoutToken || "");
  if (!orderId || !checkoutToken) return json({ error: "Ödeme doğrulama bilgisi eksik" }, 400, cors);
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ? AND payment_token = ?").bind(orderId, checkoutToken).first();
  if (!order) return json({ error: "Sipariş bulunamadı" }, 404, cors);
  if (order.payment_status === "paid") return json({ error: "Sipariş zaten ödendi" }, 409, cors);
  const settingsRow = await env.DB.prepare("SELECT value FROM store_settings WHERE key='store'").first();
  const settings = safeJson(settingsRow?.value, {});
  if (settings.testMode) return json({ mode: "test" }, 200, cors);
  const provider = settings.provider === "paytr" ? "paytr" : "iyzico";
  const creds = await getCredentials(env, provider);
  if (!creds) return json({ error: "Ödeme sağlayıcısı henüz yapılandırılmadı. Yönetim panelinden Sanal POS bilgilerini girin.", mode: "unconfigured" }, 409, cors);
  const customer = safeJson(order.customer_json, {});
  const items = (await env.DB.prepare("SELECT product_id,product_name,unit_price,quantity FROM order_items WHERE order_id = ?").bind(order.id).all()).results;
  const clientIp = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  try {
    if (provider === "iyzico") {
      const result = await iyzicoInit(creds, order, customer, items, settings, request);
      if (result.error) return json({ error: result.error }, 502, cors);
      await env.DB.prepare("UPDATE orders SET payment_token=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(result.token, order.id).run();
      await audit(env, "storefront", "payment.initialized", "order", order.id, { provider });
      return json({ mode: "live", provider, paymentPageUrl: result.paymentPageUrl }, 200, cors);
    }
    const result = await paytrInit(env, creds, order, customer, items, clientIp);
    if (result.error) return json({ error: result.error }, 502, cors);
    await env.DB.prepare("UPDATE orders SET payment_token=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(result.merchantOid, order.id).run();
    await audit(env, "storefront", "payment.initialized", "order", order.id, { provider });
    return json({ mode: "live", provider, iframeUrl: result.iframeUrl }, 200, cors);
  } catch (error) {
    console.error("payment init", error);
    return json({ error: "Ödeme sağlayıcısına ulaşılamadı, lütfen tekrar deneyin" }, 502, cors);
  }
}

// ---- iyzico ----
async function iyzicoAuthHeader(creds, uriPath, requestBody) {
  const randomKey = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const signature = await hmacHex(randomKey + uriPath + requestBody, creds.secretKey);
  const authorization = `apiKey:${creds.apiKey}&randomKey:${randomKey}&signature:${signature}`;
  return { header: `IYZWSv2 ${toBase64(encoder.encode(authorization))}`, randomKey };
}
async function iyzicoInit(creds, order, customer, items, settings, request) {
  const base = creds.sandbox ? "https://sandbox-api.iyzipay.com" : "https://api.iyzipay.com";
  const uriPath = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
  const price = Number(order.total).toFixed(1);
  const callback = `${new URL(request.url).origin}/api/payments/callback/iyzico?order=${encodeURIComponent(order.id)}`;
  // Sepet kalemleri iyzico'da toplam fiyata eşit olmalı: indirim orantılı dağıtılır, yuvarlama farkı son kaleme yazılır.
  const gross = Math.max(1, Number(order.total) + Number(order.discount || 0));
  let allocated = 0;
  const basketItems = items.map((item, index) => {
    const share = index === items.length - 1
      ? Number((order.total - allocated).toFixed(2))
      : Number((item.unit_price * item.quantity * order.total / gross).toFixed(2));
    allocated = Number((allocated + share).toFixed(2));
    return { id: item.product_id || "urun", name: item.product_name, category1: "Giyim", itemType: "PHYSICAL", price: share.toFixed(2) };
  });
  const payload = JSON.stringify({
    locale: "tr", conversationId: order.id, price, paidPrice: price, currency: "TRY", basketId: order.order_no,
    paymentGroup: "PRODUCT", callbackUrl: callback,
    enabledInstallments: Array.isArray(settings.installments) && settings.installments.length ? settings.installments : [1],
    buyer: { id: "guest", name: customer.firstName || "Misafir", surname: customer.lastName || "Müşteri", gsmNumber: customer.phone || "", email: customer.email || "", identityNumber: "11111111111", registrationAddress: order.shipping_address, ip: request.headers.get("CF-Connecting-IP") || "85.34.78.112", city: customer.city || "İstanbul", country: "Turkey" },
    shippingAddress: { contactName: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Müşteri", city: customer.city || "İstanbul", country: "Turkey", address: order.shipping_address },
    billingAddress: { contactName: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Müşteri", city: customer.city || "İstanbul", country: "Turkey", address: order.shipping_address },
    basketItems
  });
  const { header } = await iyzicoAuthHeader(creds, uriPath, payload);
  const response = await fetch(base + uriPath, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": header }, body: payload });
  const result = await response.json().catch(() => ({}));
  if (result.status !== "success") return { error: result.errorMessage || "iyzico ödeme başlatılamadı" };
  return { token: result.token, paymentPageUrl: result.paymentPageUrl || null };
}
async function iyzicoRetrieve(creds, token, conversationId) {
  const base = creds.sandbox ? "https://sandbox-api.iyzipay.com" : "https://api.iyzipay.com";
  const uriPath = "/payment/iyzipos/checkoutform/auth/ecom/detail";
  const payload = JSON.stringify({ locale: "tr", conversationId, token });
  const { header } = await iyzicoAuthHeader(creds, uriPath, payload);
  const response = await fetch(base + uriPath, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": header }, body: payload });
  return response.json().catch(() => ({}));
}
async function iyzicoCallback(request, env, url) {
  const orderId = url.searchParams.get("order") || "";
  const store = storefrontUrl(env);
  let token = "";
  try { const form = await request.formData(); token = String(form.get("token") || ""); } catch { token = url.searchParams.get("token") || ""; }
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
  if (!order || !token || order.payment_token !== token) return Response.redirect(`${store}?payment=fail&order=${encodeURIComponent(order?.order_no || "")}`, 302);
  const creds = await getCredentials(env, "iyzico");
  if (!creds) return Response.redirect(`${store}?payment=fail&order=${encodeURIComponent(order.order_no)}`, 302);
  const result = await iyzicoRetrieve(creds, token, order.id);
  const success = result.status === "success" && result.paymentStatus === "SUCCESS";
  if (success) {
    await env.DB.prepare("UPDATE orders SET payment_status='paid',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(order.id).run();
    await bumpVersion(env);
    await audit(env, "iyzico", "payment.completed", "order", order.id, { orderNo: order.order_no });
  } else await audit(env, "iyzico", "payment.failed", "order", order.id, { orderNo: order.order_no, detail: result.errorMessage || result.paymentStatus || "unknown" });
  return Response.redirect(`${store}?payment=${success ? "success" : "fail"}&order=${encodeURIComponent(order.order_no)}`, 302);
}

// ---- PayTR ----
async function paytrInit(env, creds, order, customer, items, clientIp) {
  const merchantOid = order.order_no.replace(/[^A-Za-z0-9]/g, "");
  const amount = String(Math.round(order.total * 100));
  const basket = toBase64(encoder.encode(JSON.stringify(items.map(item => [item.product_name, String(item.unit_price), item.quantity]))));
  const noInstallment = "0", maxInstallment = "0", currency = "TL", testMode = "0";
  const hashStr = creds.merchantId + clientIp + merchantOid + (customer.email || "") + amount + basket + noInstallment + maxInstallment + currency + testMode;
  const paytrToken = await hmacRawB64(hashStr + creds.merchantSalt, creds.merchantKey);
  const store = storefrontUrl(env);
  const form = new URLSearchParams({
    merchant_id: creds.merchantId, user_ip: clientIp, merchant_oid: merchantOid, email: customer.email || "",
    payment_amount: amount, paytr_token: paytrToken, user_basket: basket, debug_on: "0", no_installment: noInstallment,
    max_installment: maxInstallment, user_name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Müşteri",
    user_address: order.shipping_address, user_phone: customer.phone || "", currency,
    merchant_ok_url: `${store}?payment=success&order=${encodeURIComponent(order.order_no)}`,
    merchant_fail_url: `${store}?payment=fail&order=${encodeURIComponent(order.order_no)}`,
    timeout_limit: "30", test_mode: testMode
  });
  const response = await fetch("https://www.paytr.com/odeme/api/get-token", { method: "POST", body: form });
  const result = await response.json().catch(() => ({}));
  if (result.status !== "success") return { error: result.reason || "PayTR ödeme başlatılamadı" };
  return { iframeUrl: `https://www.paytr.com/odeme/guvenli/${result.token}`, merchantOid };
}
async function paytrWebhook(request, env) {
  const creds = await getCredentials(env, "paytr");
  if (!creds) return new Response("OK");
  const form = await request.formData();
  const merchantOid = String(form.get("merchant_oid") || ""), status = String(form.get("status") || ""), totalAmount = String(form.get("total_amount") || ""), hash = String(form.get("hash") || "");
  const expected = await hmacRawB64(merchantOid + creds.merchantSalt + status + totalAmount, creds.merchantKey);
  if (!(await constantEqual(hash, expected))) return new Response("PAYTR notification failed: bad hash", { status: 400 });
  const order = await env.DB.prepare("SELECT * FROM orders WHERE payment_token = ?").bind(merchantOid).first();
  if (order) {
    if (status === "success") {
      await env.DB.prepare("UPDATE orders SET payment_status='paid',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(order.id).run();
      await bumpVersion(env);
      await audit(env, "paytr", "payment.completed", "order", order.id, { orderNo: order.order_no });
    } else await audit(env, "paytr", "payment.failed", "order", order.id, { orderNo: order.order_no });
  }
  return new Response("OK");
}
