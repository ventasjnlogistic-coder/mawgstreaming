const JsonOrderStore = require("./jsonOrderStore");
const AppsScriptOrderStore = require("./appsScriptOrderStore");
const { enabled: d1Enabled, D1OrderStore } = require("../d1/d1OperationalStores");

function hasAppsScriptConfig(env) {
  return Boolean(String(env.APPS_SCRIPT_CATALOG_URL || "").trim() && String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim());
}

function createOrderStore(env = process.env) {
  if (d1Enabled(env)) return new D1OrderStore(env.DB);
  if (env.CATALOG_STORAGE === "apps-script") {
    if (!hasAppsScriptConfig(env)) {
      console.warn(
        "CATALOG_STORAGE=apps-script sin APPS_SCRIPT_CATALOG_URL o APPS_SCRIPT_ADMIN_TOKEN. Los pedidos se guardaran en pedidos.json."
      );
    } else {
      return new AppsScriptOrderStore({
        endpointUrl: String(env.APPS_SCRIPT_CATALOG_URL || "").trim(),
        adminToken: String(env.APPS_SCRIPT_ADMIN_TOKEN || "").trim(),
        proofDriveFolderId: String(env.APPS_SCRIPT_PROOF_DRIVE_FOLDER_ID || "").trim(),
        timeoutMs: env.APPS_SCRIPT_TIMEOUT_MS,
      });
    }
  }

  return new JsonOrderStore(env.ORDERS_JSON_PATH || "pedidos.json");
}

module.exports = {
  createOrderStore,
};
