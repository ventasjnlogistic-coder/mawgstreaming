const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const { Miniflare, convertV4MiniflareOptions } = require("miniflare");

// Ejecutar despues de generar .tmp-worker-check/worker.js con Wrangler --dry-run.
test("login, migracion de clave, revocacion y logout en el runtime real de Workers", { timeout: 60000 }, async (t) => {
  let password = "worker-secret";
  const mock = http.createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const data = JSON.parse(body);
    assert.equal(data.token, "worker-private-token");
    let result;
    if (data.action === "users.credentials") {
      result = { ok: true, user: data.usuario === "operator" ? { usuario: "operator", nombre: "Operator", estado: "activo", permisos: "*", password } : null };
    } else if (data.action === "users.password-upgrade") {
      assert.equal(data.previous, password);
      password = data.hash;
      result = { ok: true };
    } else result = { ok: false, error: "Accion de prueba no soportada" };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  });
  await new Promise((resolve) => mock.listen(0, "127.0.0.1", resolve));
  t.after(async () => { if (mock.listening) await new Promise((resolve) => mock.close(resolve)); });
  const mf = new Miniflare(convertV4MiniflareOptions({ workers: [{
    name: "mawg-test",
    scriptPath: path.join(__dirname, "../.tmp-worker-check/worker.js"),
    modules: true,
    compatibilityDate: "2026-09-16",
    compatibilityFlags: ["nodejs_compat_v2", "enable_nodejs_http_server_modules"],
    bindings: {
      NODE_ENV: "development", CATALOG_STORAGE: "apps-script", OPERATIONS_STORAGE: "apps-script",
      ADMIN_USER: "emergency", ADMIN_PASSWORD: "emergency-secret", SESSION_SECRET: "worker-test-secret-with-enough-length",
      APPS_SCRIPT_CATALOG_URL: `http://127.0.0.1:${mock.address().port}/exec`, APPS_SCRIPT_ADMIN_TOKEN: "worker-private-token",
    },
    kvNamespaces: ["SESSIONS"],
    durableObjects: { SECURITY_STATE: { className: "SecurityState", useSQLite: true } },
  }] }));
  try {
    const request = async (pathname, body, cookie) => mf.dispatchFetch(`http://worker.test${pathname}`, {
      ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4", ...(cookie ? { Cookie: cookie } : {}) },
    });
    const login = async () => {
      const response = await request("/api/admin/login", { usuario: "operator", password: "worker-secret" });
      assert.equal(response.status, 200, await response.text());
      return response.headers.getSetCookie().find((value) => value.startsWith("streamhub.sid=")).split(";")[0];
    };
    const cookie = await login();
    assert.match(password, /^scrypt\$v1\$/);
    assert.equal((await (await request("/api/admin/session", null, cookie)).json()).authenticated, true);
    assert.equal((await request("/api/admin/sesiones/revocar", { usuario: "operator" }, cookie)).status, 200);
    assert.equal((await (await request("/api/admin/session", null, cookie)).json()).authenticated, false);
    const renewed = await login();
    const audit = await (await request("/api/admin/auditoria", null, renewed)).json();
    assert.equal(audit[0].accion, "revocar_sesiones");
    assert.equal((await request("/api/admin/logout", {}, renewed)).status, 200);
    assert.equal((await (await request("/api/admin/session", null, renewed)).json()).authenticated, false);
  } finally {
    await mf.dispose();
    await new Promise((resolve) => mock.close(resolve));
  }
});

test("Worker arranca sin namespace en validacion y rechaza login si sigue ausente", { timeout: 20000 }, async () => {
  const mf = new Miniflare(convertV4MiniflareOptions({ workers: [{
    name: "mawg-validation-test",
    scriptPath: path.join(__dirname, "../.tmp-worker-check/worker.js"),
    modules: true,
    compatibilityDate: "2026-09-16",
    compatibilityFlags: ["nodejs_compat_v2", "enable_nodejs_http_server_modules"],
    bindings: {
      NODE_ENV: "test", CATALOG_STORAGE: "json", OPERATIONS_STORAGE: "apps-script",
      ADMIN_USER: "validation-admin", ADMIN_PASSWORD: "validation-secret", SESSION_SECRET: "validation-session-secret-long-enough",
    },
    handleStructuredLogs: () => {},
  }] }));
  try {
    const status = await mf.dispatchFetch("http://worker.test/api/admin/session");
    assert.equal(status.status, 200);
    assert.equal((await status.json()).authenticated, false);
    const login = await mf.dispatchFetch("http://worker.test/api/admin/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: "validation-admin", password: "validation-secret" }),
    });
    assert.equal(login.status, 503);
    assert.ok(!login.headers.getSetCookie().some((value) => value.startsWith("streamhub.sid=")));
  } finally { await mf.dispose(); }
});

test("Worker sirve recursos minificados mediante ASSETS sin acceso a archivos locales", { timeout: 20000 }, async () => {
  const requested = [];
  const mf = new Miniflare(convertV4MiniflareOptions({ workers: [{
    name: 'mawg-assets-test',
    scriptPath: path.join(__dirname, '../.tmp-worker-check/worker.js'),
    modules: true, compatibilityDate: '2026-09-16',
    compatibilityFlags: ['nodejs_compat_v2', 'enable_nodejs_http_server_modules'],
    bindings: { NODE_ENV: 'production', CATALOG_STORAGE: 'apps-script', OPERATIONS_STORAGE: 'apps-script',
      SESSION_SECRET: 'static-assets-test-session-secret-long-enough', ADMIN_USER: 'assets-admin', ADMIN_PASSWORD: 'assets-test-password', APPS_SCRIPT_CATALOG_URL: 'https://example.invalid/exec', APPS_SCRIPT_ADMIN_TOKEN: 'asset-test-token' },
    durableObjects: { SECURITY_STATE: { className: 'SecurityState', useSQLite: true } },
    serviceBindings: { ASSETS: async request => {
      const pathname = new URL(request.url).pathname;
      requested.push(pathname);
      if (request.headers.get('if-none-match') === '"test-asset"') return new Response(null, { status: 304, headers: { ETag: '"test-asset"' } });
      return new Response('/* minified asset */', { headers: { 'Content-Type': 'text/javascript', ETag: '"test-asset"' } });
    } },
  }] }));
  try {
    const response = await mf.dispatchFetch('https://worker.test/script.js');
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '/* minified asset */');
    assert.deepEqual(requested, ['/dist/script.js']);
    const cached = await mf.dispatchFetch('https://worker.test/script.js', { headers: { 'If-None-Match': '"test-asset"' } });
    assert.equal(cached.status, 304);
    const admin = await mf.dispatchFetch('https://worker.test/admin-reports.js', { redirect: 'manual' });
    assert.notEqual(admin.status, 200);
    assert.equal(requested.some(url => url.includes('admin-reports')), false);
  } finally { await mf.dispose(); }
});
