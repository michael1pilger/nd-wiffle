function b64urlBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const raw = atob(s);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
function b64urlJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlBytes(s)));
}
function normalizeDomain(value) {
  const v = String(value || "").trim().replace(/\/+$/, "");
  return v.startsWith("http://") || v.startsWith("https://") ? v : `https://${v}`;
}
async function verifyAccessJWT(token, domain, aud) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("Malformed Access JWT");
  const [h, p, s] = parts;
  const header = b64urlJson(h);
  const payload = b64urlJson(p);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported Access JWT");
  const base = normalizeDomain(domain);
  const certs = await fetch(`${base}/cdn-cgi/access/certs`, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!certs.ok) throw new Error("Could not load Access signing keys");
  const jwks = await certs.json();
  const jwk = (jwks.keys || []).find(k => k.kid === header.kid);
  if (!jwk) throw new Error("Access signing key not found");
  const key = await crypto.subtle.importKey(
    "jwk", jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlBytes(s),
    new TextEncoder().encode(`${h}.${p}`)
  );
  if (!valid) throw new Error("Invalid Access JWT signature");
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now >= payload.exp) throw new Error("Expired Access JWT");
  if (payload.nbf && now < payload.nbf) throw new Error("Access JWT not active");
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(aud)) throw new Error("Access JWT audience mismatch");
  const expectedIss = `${base}/`;
  if (payload.iss && payload.iss !== base && payload.iss !== expectedIss) throw new Error("Access JWT issuer mismatch");
  return payload;
}
function json(body, status=200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
export async function onRequest(context) {
  const { ACCESS_TEAM_DOMAIN, ACCESS_AUD } = context.env;
  if (!ACCESS_TEAM_DOMAIN || !ACCESS_AUD) {
    return json({ ok:false, error:"Server Access verification is not configured." }, 500);
  }
  const token = context.request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return json({ ok:false, error:"Missing Cloudflare Access assertion." }, 401);
  try {
    const payload = await verifyAccessJWT(token, ACCESS_TEAM_DOMAIN, ACCESS_AUD);
    context.data.access = payload;
    context.data.actorEmail = payload.email || payload.common_name || "unknown-access-user";
    return await context.next();
  } catch (err) {
    return json({ ok:false, error:"Cloudflare Access verification failed.", detail:String(err?.message || err) }, 403);
  }
}
