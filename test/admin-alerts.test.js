const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../public/admin.js"), "utf8");
function section(start, end) {
  const offset = source.indexOf(start);
  assert.ok(offset >= 0, start);
  const limit = source.indexOf(end, offset + start.length);
  assert.ok(limit > offset, end);
  return source.slice(offset, limit);
}

function harness({ fail = false } = {}) {
  const handlers = {};
  const opened = [];
  const statuses = [];
  let requests = 0;
  const context = vm.createContext({
    messageTemplates: [],
    selectedInventoryId: "INV-1",
    inventoryItems: [{ inventario_id: "INV-1", cliente_contacto: "999999999" }],
    renewals: [{ renovacion_id: "REN-1", inventario_id: "INV-1" }],
    cutServiceButton: { addEventListener: (_, fn) => { handlers.cut = fn; } },
    dataUpdateButton: { addEventListener: (_, fn) => { handlers.update = fn; } },
    apiRequest: async () => {
      requests += 1;
      if (fail) throw new Error("offline");
      return [{ id: "custom", contenido: "Mi plantilla configurada" }];
    },
    normalizeMessageTemplate: (value) => value,
    resolveRenewalSource: (value) => value,
    buildWhatsAppUrl: (_, message) => message,
    openWhatsAppLink: (message) => { opened.push(message); return true; },
    setStatus: (...args) => statuses.push(args),
  });
  vm.runInContext(section("async function ensureAlertTemplatesLoaded()", "function buildWhatsAppUrl("), context);
  vm.runInContext(`
    function configuredMessage() { return messageTemplates[0]?.contenido || "DEFAULT"; }
    const buildServiceCutMessage = configuredMessage;
    const buildDataUpdateMessage = configuredMessage;
    const buildRenewalConfirmationMessage = configuredMessage;
  `, context);
  vm.runInContext(section('cutServiceButton?.addEventListener("click",', 'toggleInventoryPasswordButton?.addEventListener('), context);
  vm.runInContext(section("async function sendRenewalConfirmationMessage(", "async function saveInventoryItem("), context);
  handlers.confirm = () => context.sendRenewalConfirmationMessage("REN-1");
  return { handlers, opened, statuses, requests: () => requests };
}

for (const action of ["cut", "update", "confirm"]) {
  test(`${action}: carga plantillas sin abrir la seccion Plantillas`, async () => {
    const state = harness();
    await state.handlers[action]();
    assert.equal(state.requests(), 1);
    assert.deepEqual(state.opened, ["Mi plantilla configurada"]);
    await state.handlers[action]();
    assert.equal(state.requests(), 1, "reutiliza las plantillas cargadas");
  });

  test(`${action}: no envia texto por defecto si falla la carga`, async () => {
    const state = harness({ fail: true });
    await state.handlers[action]();
    assert.deepEqual(state.opened, []);
    assert.ok(state.statuses.some(([message, error]) => error && message.includes("plantillas")));
  });
}
