const test = require("node:test");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");
const vm = require("node:vm");
const { hashPassword, verifyPassword } = require("../src/services/users/passwords");
const AppsScriptUserStore = require("../src/services/users/appsScriptUserStore");
const AppsScriptMessageTemplateStore = require("../src/services/messageTemplates/appsScriptMessageTemplateStore");
const DurableSessionStore = require("../src/services/sessions/durableSessionStore");
const { createRateLimiter } = require("../src/services/security/rateLimiter");
const { createSessionVersions } = require("../src/services/security/sessionVersions");

test("hashes con sal unica, verificacion y rechazo de hashes corruptos", async () => {
  const first = await hashPassword("secret");
  const second = await hashPassword("secret");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("secret", first), true);
  assert.equal(await verifyPassword("wrong", first), false);
  assert.equal(await verifyPassword("secret", "scrypt$v1$bad$hash"), false);
  assert.equal(await verifyPassword("scrypt$bad", "scrypt$bad"), false);
});

test("Apps Script migra claves tras validarlas y nunca devuelve el hash al cliente", async () => {
  const store = new AppsScriptUserStore({ endpointUrl: "https://example.test", adminToken: "private-token" });
  const calls = [];
  let password = "legacy-secret";
  store.request = async (data) => {
    calls.push(data);
    if (data.action === "users.credentials") return { user: { usuario: "operator", estado: "activo", password, permisos: "inventario" } };
    assert.equal(data.previous, "legacy-secret");
    assert.equal(await verifyPassword("legacy-secret", data.hash), true);
    password = data.hash;
    return { ok: true };
  };
  assert.equal(await store.authenticate("operator", "wrong"), null);
  const user = await store.authenticate("operator", "legacy-secret");
  assert.equal(user.password, undefined);
  assert.equal((await store.authenticate("operator", "legacy-secret")).usuario, "operator");
  assert.equal(calls.filter((call) => call.action === "users.password-upgrade").length, 1);
});

test("Apps Script de usuarios envia el token solo al backend remoto", async () => {
  const original = global.fetch;
  global.fetch = async (_url, options) => {
    assert.deepEqual(JSON.parse(options.body), { action: "users.credentials", usuario: "operator", token: "private-token" });
    return Response.json({ ok: true, user: null });
  };
  try {
    const store = new AppsScriptUserStore({ endpointUrl: "https://example.test", adminToken: "private-token" });
    assert.equal(await store.authenticate("operator", "secret"), null);
  } finally { global.fetch = original; }
});

test("fallos remotos de plantillas no se ocultan con mensajes por defecto", async () => {
  const store = new AppsScriptMessageTemplateStore({ endpointUrl: "https://example.test", adminToken: "token" });
  store.request = async () => { throw new Error("offline"); };
  await assert.rejects(() => store.listTemplates(), /offline/);
  store.request = async () => ({ templates: [] });
  assert.deepEqual(await store.listTemplates(), []);
});

async function namespace() {
  const { SecurityState } = await import(pathToFileURL(path.join(__dirname, "../src/services/security/durableSecurityState.mjs")).href);
  const objects = new Map();
  return {
    idFromName: (value) => value,
    get(id) {
      if (!objects.has(id)) {
        const records = new Map();
        let pending = Promise.resolve();
        const ctx = {
          storage: {
            get: async (key) => structuredClone(records.get(key)),
            put: async (key, value) => { records.set(key, structuredClone(value)); },
            setAlarm: async () => {},
            list: async ({ prefix, reverse, limit }) => {
              let keys = [...records.keys()].filter((key) => key.startsWith(prefix)).sort();
              if (reverse) keys.reverse();
              return new Map(keys.slice(0, limit).map((key) => [key, structuredClone(records.get(key))]));
            },
            delete: async (keys) => { for (const key of Array.isArray(keys) ? keys : [keys]) records.delete(key); },
            deleteAll: async () => { records.clear(); },
          },
          blockConcurrencyWhile(fn) { const result = pending.then(fn); pending = result.catch(() => {}); return result; },
        };
        const object = new SecurityState(ctx);
        objects.set(id, { fetch: (url, init) => object.fetch(new Request(url, init)) });
      }
      return objects.get(id);
    },
  };
}
function runLimiter(limiter, ip = "1.2.3.4") {
  return new Promise((resolve, reject) => {
    const response = { setHeader() {}, status(status) { this.code = status; return this; }, json(body) { resolve({ status: this.code, body }); } };
    limiter({ ip, headers: {} }, response, (error) => error ? reject(error) : resolve({ status: 200 }));
  });
}

test("dos instancias comparten el limite por IP sin depender de D1", async () => {
  const state = await namespace();
  const options = { namespace: state, scope: "login", max: 2, windowMs: 60000, message: "limit" };
  const first = createRateLimiter(options);
  const second = createRateLimiter(options);
  const results = await Promise.all([runLimiter(first), runLimiter(second), runLimiter(first), runLimiter(second)]);
  assert.equal(results.filter((result) => result.status === 200).length, 2);
  assert.equal(results.filter((result) => result.status === 429).length, 2);
  assert.equal((await runLimiter(second, "5.6.7.8")).status, 200);
  assert.equal((await runLimiter(createRateLimiter({ ...options, scope: "orders" }))).status, 200);
});

test("limite local expira y Workers falla si no hay estado compartido", async () => {
  let now = 100;
  const limiter = createRateLimiter({ scope: "login", max: 1, windowMs: 10, message: "limit", clock: () => now });
  assert.equal((await runLimiter(limiter)).status, 200);
  assert.equal((await runLimiter(limiter)).status, 429);
  now += 11;
  assert.equal((await runLimiter(limiter)).status, 200);
  await assert.rejects(() => runLimiter(createRateLimiter({ workerRuntime: true })), /SECURITY_STATE/);
});

function storeCall(store, method, ...args) {
  return new Promise((resolve, reject) => store[method](...args, (error, value) => error ? reject(error) : resolve(value)));
}

test("sesiones compartidas no resucitan tras logout por una escritura en vuelo", async () => {
  const state = await namespace();
  const first = new DurableSessionStore({ namespace: state, ttlMs: 60000 });
  const second = new DurableSessionStore({ namespace: state, ttlMs: 60000 });
  const value = { authenticated: true, cookie: { expires: new Date(Date.now() + 60000).toISOString() } };
  await storeCall(first, "set", "session-id", value);
  assert.equal((await storeCall(second, "get", "session-id")).authenticated, true);
  await storeCall(first, "destroy", "session-id");
  await storeCall(second, "set", "session-id", value);
  await storeCall(second, "touch", "session-id", value);
  assert.equal(await storeCall(first, "get", "session-id"), null);
});

test("revocacion por usuario se comparte entre instancias", async () => {
  const state = await namespace();
  const first = createSessionVersions(state);
  const second = createSessionVersions(state);
  assert.equal(await first.get("operator"), "");
  const version = await first.revoke("operator");
  assert.ok(version);
  assert.equal(await second.get("operator"), version);
  assert.equal(await second.get("other"), "");
});

test("Web App bloquea consultas de credenciales sin token y migra con comparacion previa", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../scripts/google-apps-script-catalogo.gs"), "utf8");
  const rows = [["operator", "Operator", "operaciones", "legacy", "activo", "inventario"]];
  const context = vm.createContext({
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { flush() {} },
    fakeSheet: { getLastRow: () => 2, getRange: (row, col) => ({ getValues: () => rows, setValue: (value) => { rows[row - 2][col - 1] = value; } }) },
  });
  vm.runInContext(source, context);
  vm.runInContext('jsonResponse = (value) => value; invalidateReadCache_ = () => {}; getAdminUsersSheet_ = () => fakeSheet;', context);
  const call = (payload) => context.doPost({ postData: { contents: JSON.stringify(payload) } });
  for (const action of ["users.credentials", "users.password-upgrade", "users.auth"]) assert.equal(call({ action, usuario: "operator" }).ok, false);
  const data = call({ action: "users.credentials", usuario: "operator", token: "cambia-este-token-largo" });
  assert.equal(data.user.password, "legacy");
  const hash = await hashPassword("legacy");
  assert.equal(call({ action: "users.password-upgrade", usuario: "operator", previous: "wrong", hash, token: "cambia-este-token-largo" }).ok, false);
  assert.equal(rows[0][3], "legacy");
  assert.equal(call({ action: "users.password-upgrade", usuario: "operator", previous: "legacy", hash, token: "cambia-este-token-largo" }).ok, true);
  assert.equal(rows[0][3], hash);
});

test("revocaciones en Node con sesiones de archivo sobreviven a reinicios", async () => {
  const fsPromises = require("node:fs/promises");
  const os = require("node:os");
  const directory = await fsPromises.mkdtemp(path.join(os.tmpdir(), "mawg-versions-"));
  try {
    const first = createSessionVersions(null, directory);
    const version = await first.revoke("operator");
    const restarted = createSessionVersions(null, directory);
    assert.equal(await restarted.get("operator"), version);
    assert.equal(await restarted.get("other"), "");
  } finally { await fsPromises.rm(directory, { recursive: true, force: true }); }
});

test("auditoria compartida persiste y devuelve los ultimos eventos sin archivos locales", async () => {
  const DurableAuditStore = require("../src/services/audit/durableAuditStore");
  const state = await namespace();
  const first = new DurableAuditStore(state);
  const second = new DurableAuditStore(state);
  await first.appendEvent({ evento_id: "one", creado_en: "2026-10-25T10:00:00Z" });
  await first.appendEvent({ evento_id: "two", creado_en: "2026-10-25T11:00:00Z" });
  const events = await second.listEvents({ limit: 1 });
  assert.equal(events.length, 1);
  assert.equal(events[0].evento_id, "two");
});

test("un rol mixto de proveedores y reportes no recibe claves de inventario", () => {
  const { filterOperationalData } = require("../src/services/security/access");
  const snapshot = filterOperationalData(["proveedores", "reportes"], {
    inventory: [{ cuenta_clave: "secret", cuenta_usuario: "user" }],
    provider_purchases: [{ cuenta_clave: "supplier-secret" }],
  });
  assert.equal(snapshot.inventory[0].cuenta_clave, undefined);
  assert.equal(snapshot.provider_purchases[0].cuenta_clave, "supplier-secret");
});

test("la inicializacion de seguridad no consulta el binding durante la validacion", async () => {
  const { createSecurityNamespace } = require("../src/services/security/client");
  const { createAuditStore } = require("../src/services/audit");
  const DurableAuditStore = require("../src/services/audit/durableAuditStore");
  let current;
  let reads = 0;
  const deferred = createSecurityNamespace(() => { reads += 1; return current; }, true);
  const sessions = new DurableSessionStore({ namespace: deferred, ttlMs: 60000 });
  const versions = createSessionVersions(deferred);
  const audit = createAuditStore({}, deferred);
  assert.ok(audit instanceof DurableAuditStore);
  assert.equal(reads, 0, "ningun almacen captura un namespace ausente al arrancar");
  await assert.rejects(() => versions.get("operator"), /SECURITY_STATE/);
  current = await namespace();
  await storeCall(sessions, "set", "late-binding", { authenticated: true, cookie: { expires: new Date(Date.now() + 60000).toISOString() } });
  assert.equal((await storeCall(sessions, "get", "late-binding")).authenticated, true);
  await audit.appendEvent({ evento_id: "late", creado_en: "2026-10-25T12:00:00Z" });
  assert.equal((await audit.listEvents())[0].evento_id, "late");
});

test("un binding ausente no degrada los limites de Workers a memoria local", async () => {
  const { createSecurityNamespace } = require("../src/services/security/client");
  const deferred = createSecurityNamespace(() => undefined, true);
  const limiter = createRateLimiter({ namespace: deferred, workerRuntime: true, scope: "login", max: 8, windowMs: 60000, message: "limit" });
  await assert.rejects(() => runLimiter(limiter), /SECURITY_STATE/);
});
