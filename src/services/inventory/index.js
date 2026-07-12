const JsonInventoryStore = require("./jsonInventoryStore");
const AppsScriptInventoryStore = require("./appsScriptInventoryStore");

function hasAppsScriptConfig(env) {
  return Boolean(String(env.APPS_SCRIPT_CATALOG_URL || "").trim() && String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim());
}

function createInventoryStore(env = process.env) {
  if (env.CATALOG_STORAGE === "apps-script") {
    if (!hasAppsScriptConfig(env)) {
      console.warn(
        "CATALOG_STORAGE=apps-script sin APPS_SCRIPT_CATALOG_URL o APPS_SCRIPT_ADMIN_TOKEN. El inventario se guardara en inventario-cuentas.json."
      );
    } else {
      return new AppsScriptInventoryStore({
        endpointUrl: String(env.APPS_SCRIPT_CATALOG_URL || "").trim(),
        adminToken: String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim(),
        timeoutMs: env.APPS_SCRIPT_TIMEOUT_MS,
      });
    }
  }

  return new JsonInventoryStore(env.INVENTORY_JSON_PATH || "inventario-cuentas.json");
}

module.exports = {
  createInventoryStore,
};
