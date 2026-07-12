const JsonSupplierStore = require("./jsonSupplierStore");
const AppsScriptSupplierStore = require("./appsScriptSupplierStore");

function hasAppsScriptConfig(env) {
  return Boolean(String(env.APPS_SCRIPT_CATALOG_URL || "").trim() && String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim());
}

function createSupplierStore(env = process.env) {
  const jsonStore = new JsonSupplierStore({
    providersPath: env.PROVIDERS_JSON_PATH || "proveedores.json",
    purchasesPath: env.PROVIDER_PURCHASES_JSON_PATH || "compras-proveedor.json",
  });

  if (env.SUPPLIERS_STORAGE === "json") {
    return jsonStore;
  }

  if (env.CATALOG_STORAGE === "apps-script") {
    if (!hasAppsScriptConfig(env)) {
      console.warn(
        "CATALOG_STORAGE=apps-script sin APPS_SCRIPT_CATALOG_URL o APPS_SCRIPT_ADMIN_TOKEN. Los proveedores se guardaran en JSON local."
      );
    } else {
      return new AppsScriptSupplierStore({
        endpointUrl: String(env.APPS_SCRIPT_CATALOG_URL || "").trim(),
        adminToken: String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim(),
        timeoutMs: env.APPS_SCRIPT_TIMEOUT_MS,
        fallbackStore: jsonStore,
      });
    }
  }

  return jsonStore;
}

module.exports = {
  createSupplierStore,
};
