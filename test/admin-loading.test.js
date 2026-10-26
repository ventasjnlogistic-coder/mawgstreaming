const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../public/admin.js"), "utf8");
const code = source.slice(source.indexOf("function getAdminViewModuleIds("), source.indexOf("async function refreshOperationalData("));
function harness() {
  const loaded = [];
  const state = new Map();
  const context = vm.createContext({
    moduleLoadState: state,
    userCanReadModule: () => true,
    getAdminModuleLoader: (id) => id,
    loadManagedModule: async (id) => { loaded.push(id); state.set(id, { status: "ready" }); },
    loadDashboardSnapshot: async () => { loaded.push("snapshot"); },
    runWithConcurrency: async (tasks) => { for (const task of tasks) await task(); },
  });
  vm.runInContext(code, context);
  return { context, loaded };
}

test("abrir Plantillas carga solo sus datos", async () => {
  const { context, loaded } = harness();
  await context.loadInitialAdminViewData("plantillas");
  assert.deepEqual(loaded, ["plantillas"]);
});

test("inventario carga sus dependencias y navegar a renovaciones agrega las pendientes", async () => {
  const { context, loaded } = harness();
  await context.loadInitialAdminViewData("inventario");
  assert.deepEqual(loaded, ["productos", "proveedores", "inventario"]);
  await context.ensureAdminViewModules("renovaciones");
  assert.deepEqual(loaded, ["productos", "proveedores", "inventario", "pedidos", "renovaciones", "pagos"]);
  await context.ensureAdminViewModules("renovaciones");
  assert.equal(loaded.length, 6);
});

test("dashboard conserva el resumen necesario para calcular indicadores", async () => {
  const { context, loaded } = harness();
  await context.loadInitialAdminViewData("dashboard");
  assert.deepEqual(loaded, ["snapshot"]);
});
